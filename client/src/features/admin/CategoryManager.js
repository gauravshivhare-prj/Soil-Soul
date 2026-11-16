"use client";

/**
 * CategoryManager — categories from GET /admin/categories (including inactive and
 * archived), with create (POST), edit (PATCH /:id) and archive/restore. Categories are
 * archived, never deleted; the API refuses to archive one that still has active products.
 * Supports strict 3-level category hierarchy (Main -> Subcategory -> Second-level subcategory)
 * and bulk CSV import with validation and preview.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { runDeletion } from "./deletion";
import CategoryCsvModal, { triggerTemplateDownload } from "./CategoryCsvModal";
import {
  CANONICAL_ROOT_SLUGS,
  getParentId,
  getCategoryLevel,
  getHierarchyPath,
  getDescendantIds,
  getSubtreeHeight,
  buildCategoryTree,
} from "./categoryHierarchy";

const toSlug = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const EMPTY = {
  name: "",
  slug: "",
  shortName: "",
  tagline: "",
  description: "",
  displayOrder: "0",
  imageSrc: "",
  imageAlt: "",
  parentId: "",
  isActive: true,
};

const categoryStatus = (c) => (c.archivedAt ? "archived" : c.isActive ? "active" : "inactive");

function toForm(c) {
  return {
    name: c.name ?? "",
    slug: c.slug ?? "",
    shortName: c.shortName ?? "",
    tagline: c.tagline ?? "",
    description: c.description ?? "",
    displayOrder: String(c.displayOrder ?? 0),
    imageSrc: c.image?.src ?? "",
    imageAlt: c.image?.alt ?? "",
    parentId: getParentId(c.parent) || "",
    isActive: Boolean(c.isActive),
  };
}

function validateForm(form, isNew) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Enter a name of at least 2 characters.";
  if (isNew && form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    errors.slug = "Use lowercase letters, numbers and hyphens.";
  }
  if (isNew && !form.parentId) {
    errors.parentId = "Select a parent category. All new categories must belong to Plants, Tools, Seeds, or Soil & Plant Care.";
  }
  if (!/^\d+$/.test(form.displayOrder.trim())) errors.displayOrder = "Enter a whole number (0 or more).";
  if (form.imageSrc.trim() && form.imageAlt.trim().length < 2) {
    errors.imageAlt = "Describe the image (at least 2 characters).";
  }
  return errors;
}

function toBody(form, isNew, editing) {
  const body = {
    name: form.name.trim(),
    shortName: form.shortName.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    displayOrder: Number(form.displayOrder.trim()),
    image: form.imageSrc.trim() ? { src: form.imageSrc.trim(), alt: form.imageAlt.trim() } : null,
  };
  if (isNew) {
    body.slug = form.slug.trim() || toSlug(form.name);
    if (!body.image) delete body.image;
    body.isActive = form.isActive;
    body.parentId = form.parentId ? form.parentId.trim() : null;
  } else {
    // If editing a canonical root, name and parent are protected: omit them from payload
    if (editing && !editing.parent && CANONICAL_ROOT_SLUGS.includes(editing.slug)) {
      delete body.name;
    } else {
      body.parentId = form.parentId ? form.parentId.trim() : null;
    }
  }
  return body;
}

export default function CategoryManager() {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [statusFilter, setStatusFilter] = useState("active");
  const { status, data, error, reload } = useAuthedResource(`/admin/categories?status=${statusFilter}&limit=100`);
  const [editing, setEditing] = useState(null); // null = adding; else the category
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const isNew = editing === null;
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const isMainCategory = (category) =>
    Boolean(category && !category.parent && CANONICAL_ROOT_SLUGS.includes(category.slug));

  const allCategories = useMemo(() => data?.categories ?? [], [data?.categories]);

  // Hierarchical list of categories for table rendering
  const displayCategories = useMemo(() => buildCategoryTree(allCategories), [allCategories]);

  // User toggle overrides for expanding/collapsing tree nodes: { [id]: boolean }
  // By default, categories start collapsed so admin clicks any main category to reveal its subcategories
  const [toggleOverrides, setToggleOverrides] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Map of direct children by parent ID
  const childrenMap = useMemo(() => {
    const map = new Map();
    for (const c of allCategories) {
      const pId = getParentId(c.parent);
      if (pId) {
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId).push(c);
      }
    }
    return map;
  }, [allCategories]);

  // Overall catalog category metrics
  const stats = useMemo(() => {
    let rootCount = 0;
    let subCount = 0;
    let nestedCount = 0;
    let totalProducts = 0;
    let activeProducts = 0;

    for (const c of allCategories) {
      const lvl = getCategoryLevel(c, allCategories);
      if (lvl === 1) rootCount++;
      else if (lvl === 2) subCount++;
      else if (lvl === 3) nestedCount++;

      if (c.productCount) totalProducts += c.productCount;
      if (c.activeProductCount) activeProducts += c.activeProductCount;
    }

    return {
      total: allCategories.length,
      roots: rootCount,
      subcategories: subCount,
      nested: nestedCount,
      totalProducts,
      activeProducts,
    };
  }, [allCategories]);

  const isCategoryExpanded = useCallback(
    (id) => {
      const idStr = String(id);
      return Boolean(toggleOverrides[idStr]);
    },
    [toggleOverrides]
  );

  const toggleExpand = (id) => {
    const idStr = String(id);
    setToggleOverrides((prev) => ({
      ...prev,
      [idStr]: !prev[idStr],
    }));
  };

  const expandAll = () => {
    const overrides = {};
    for (const c of allCategories) {
      overrides[String(c.id || c._id)] = true;
    }
    setToggleOverrides(overrides);
  };

  const collapseAll = () => {
    setToggleOverrides({});
  };

  // Search filtering with ancestor chain inclusion
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { matchingIds: new Set(), active: false, count: 0 };

    const matchingIds = new Set();
    let exactMatches = 0;
    for (const c of allCategories) {
      const name = (c.name || "").toLowerCase();
      const slug = (c.slug || "").toLowerCase();
      const shortName = (c.shortName || "").toLowerCase();
      const tagline = (c.tagline || "").toLowerCase();
      if (name.includes(q) || slug.includes(q) || shortName.includes(q) || tagline.includes(q)) {
        exactMatches++;
        matchingIds.add(String(c.id || c._id));
        // Trace ancestors up to root so path stays visible
        let curr = c;
        for (let i = 0; i < 5; i++) {
          const pId = getParentId(curr?.parent);
          if (!pId || matchingIds.has(pId)) break;
          matchingIds.add(pId);
          curr = allCategories.find((cat) => String(cat.id || cat._id) === pId);
        }
      }
    }
    return { matchingIds, active: true, count: exactMatches };
  }, [allCategories, searchQuery]);

  // Categories visible according to tree expanded state or search
  const visibleCategories = useMemo(() => {
    if (searchResults.active) {
      return displayCategories.filter((c) => searchResults.matchingIds.has(String(c.id || c._id)));
    }
    return displayCategories.filter((c) => {
      const level = getCategoryLevel(c, allCategories);
      if (level === 1) return true;
      const pId = getParentId(c.parent);
      if (!pId || !isCategoryExpanded(pId)) return false;
      if (level === 3) {
        const parent = allCategories.find((cat) => String(cat.id || cat._id) === pId);
        const grandParentId = getParentId(parent?.parent);
        if (grandParentId && !isCategoryExpanded(grandParentId)) return false;
      }
      return true;
    });
  }, [displayCategories, allCategories, isCategoryExpanded, searchResults]);

  // Compute allowed parents for the Add/Edit form ensuring strict 3-level limit
  const parentOptions = useMemo(() => {
    // Canonical main categories can never be moved under another parent
    if (editing && isMainCategory(editing)) {
      return [];
    }

    const editingId = editing ? String(editing.id || editing._id) : null;
    const editingDescendants = editingId ? getDescendantIds(editingId, allCategories) : new Set();
    const editingSubtreeHeight = editingId ? getSubtreeHeight(editingId, allCategories) : 1;

    return allCategories.filter((c) => {
      const cId = String(c.id || c._id);
      // Cannot be self
      if (editingId && cId === editingId) return false;
      // Cannot be any descendant of the category being edited
      if (editingDescendants.has(cId)) return false;
      // Must be active and not archived
      if (!c.isActive || c.archivedAt) return false;
      // Candidate parent level
      const cLevel = getCategoryLevel(c, allCategories);
      // Level 3 categories CANNOT be parents (would create Level 4)
      if (cLevel >= 3) return false;
      // If editing an existing subtree, candidate parent level + subtree height must not exceed 3
      if (cLevel + editingSubtreeHeight > 3) return false;
      return true;
    });
  }, [allCategories, editing]);

  const parentSelectOptions = useMemo(() => {
    const defaultLabel = isNew
      ? "— Select Parent Category (Plants, Tools, Seeds, Soil & Plant Care) —"
      : "Main Category (Level 1)";
    const options = [
      { value: "", label: defaultLabel },
      ...parentOptions.map((c) => {
        const lvl = getCategoryLevel(c, allCategories);
        const path = getHierarchyPath(c, allCategories);
        return {
          value: String(c.id || c._id),
          label: `${path} (Level ${lvl})`,
        };
      }),
    ];

    // Preserve selected parent in dropdown even if edge-case filter triggers, preventing unexpected reset
    if (form.parentId && !options.some((o) => o.value === String(form.parentId))) {
      const currentParent = allCategories.find((c) => String(c.id || c._id) === String(form.parentId));
      if (currentParent) {
        const lvl = getCategoryLevel(currentParent, allCategories);
        const path = getHierarchyPath(currentParent, allCategories);
        options.push({
          value: String(currentParent.id || currentParent._id),
          label: `${path} (Level ${lvl})${currentParent.isActive ? "" : " [Inactive]"}`,
        });
      }
    }

    return options;
  }, [parentOptions, allCategories, form.parentId, isNew]);

  // Compute determined level for dynamic feedback in the form
  const selectedParent = form.parentId
    ? allCategories.find((c) => String(c.id || c._id) === String(form.parentId))
    : null;
  const parentLevel = selectedParent ? getCategoryLevel(selectedParent, allCategories) : 0;
  const determinedLevel = parentLevel + 1;

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  const reset = useCallback(() => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setServerError(null);
  }, []);

  const startAddSubcategory = (parentCategory) => {
    setEditing(null);
    setForm({
      ...EMPTY,
      parentId: String(parentCategory.id || parentCategory._id),
    });
    setErrors({});
    setServerError(null);
    setIsFormModalOpen(true);
  };

  const startEditCategory = (category) => {
    setEditing(category);
    setForm(toForm(category));
    setErrors({});
    setServerError(null);
    setIsFormModalOpen(true);
  };

  const startAddCategory = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setServerError(null);
    setIsFormModalOpen(true);
  };

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isFormModalOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeFormModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormModalOpen, closeFormModal]);

  async function submit(e) {
    e.preventDefault();
    const found = validateForm(form, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy("save");
    try {
      const path = isNew ? "/admin/categories" : `/admin/categories/${editing.id}`;
      const res = await authRequest(path, { method: isNew ? "POST" : "PATCH", body: toBody(form, isNew, editing) });
      notify(`Category “${res.category.name}” ${isNew ? "added" : "updated"}.`);
      setIsFormModalOpen(false);
      reset();
      reload();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(null);
    }
  }

  // Delete an empty category (no products, archived ones included, and no subcategories).
  const [listMessage, setListMessage] = useState(null);
  async function deleteCategory(category) {
    setBusy(`delete:${category.id}`);
    setListMessage(null);
    try {
      const outcome = await runDeletion({
        label: category.name,
        loadCheck: () => authRequest(`/admin/categories/${category.id}/deletion`),
        confirm: (message) => window.confirm(message),
        remove: () => authRequest(`/admin/categories/${category.id}`, { method: "DELETE", body: { confirmSlug: category.slug } }),
      });
      if (outcome.status === "blocked") {
        setListMessage({ tone: "error", text: `“${category.name}” can't be deleted. ${outcome.message}` });
      }
      if (outcome.status === "deleted") {
        notify(`Category “${category.name}” deleted.`);
        if (editing?.id === category.id) reset();
        reload();
      }
    } catch (err) {
      setListMessage({ tone: "error", text: `“${category.name}”: ${err.message}` });
    } finally {
      setBusy(null);
    }
  }

  async function archiveOrRestore(category) {
    const action = category.archivedAt ? "restore" : "archive";
    setBusy(`${action}:${category.id}`);
    setServerError(null);
    try {
      await authRequest(`/admin/categories/${category.id}/${action}`, { method: "POST" });
      notify(`Category “${category.name}” ${action === "archive" ? "archived" : "restored"}.`);
      if (editing?.id === category.id) reset();
      reload();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Category Hierarchy Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest/10 text-forest">
              <Icon name="folder" size={18} />
            </span>
            <div>
              <p className="text-[0.6875rem] sm:text-xs text-muted uppercase font-semibold tracking-wider">Total Categories</p>
              <p className="text-xl sm:text-2xl font-bold text-ink">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest text-cream">
              <Icon name="leaf" size={18} />
            </span>
            <div>
              <p className="text-[0.6875rem] sm:text-xs text-muted uppercase font-semibold tracking-wider">Main Roots (L1)</p>
              <p className="text-xl sm:text-2xl font-bold text-forest">{stats.roots}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue/10 text-blue">
              <Icon name="grid" size={18} />
            </span>
            <div>
              <p className="text-[0.6875rem] sm:text-xs text-muted uppercase font-semibold tracking-wider">Subcategories (L2)</p>
              <p className="text-xl sm:text-2xl font-bold text-blue">{stats.subcategories}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#8a5a10]/10 text-[#8a5a10]">
              <Icon name="tag" size={18} />
            </span>
            <div>
              <p className="text-[0.6875rem] sm:text-xs text-muted uppercase font-semibold tracking-wider">Nested Sub (L3)</p>
              <p className="text-xl sm:text-2xl font-bold text-[#8a5a10]">{stats.nested}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <Card className="w-full">
          {/* Header Actions */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <CardHeader title="Catalogue Categories" />
              <span className="text-xs font-semibold text-muted bg-sand/60 px-2.5 py-0.5 rounded-full">
                {visibleCategories.length} visible
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={triggerTemplateDownload}>
                <Icon name="arrow-right" size={13} className="rotate-90" /> Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsCsvModalOpen(true)}>
                <Icon name="folder" size={13} /> Import CSV
              </Button>
              <Button size="sm" variant="primary" onClick={startAddCategory}>
                <Icon name="plus" size={13} /> Add Category
              </Button>
            </div>
          </div>

          {/* Status Filter Pills (matching InventoryManager style) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
              {[["all", "All"], ["active", "Active"], ["archived", "Archived"]].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={statusFilter === id}
                  onClick={() => setStatusFilter(id)}
                  className={`h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer transition-colors
                              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                              ${statusFilter === id ? "bg-forest text-cream font-semibold shadow-xs" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search bar */}
              <div className="relative w-48 sm:w-60">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <Icon name="search" size={13} />
                </span>
                <input
                  type="search"
                  placeholder="Search categories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-line rounded-lg outline-none focus:border-forest focus:ring-1 focus:ring-forest/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-0.5"
                    title="Clear search"
                  >
                    <Icon name="x" size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-forest transition-colors font-medium cursor-pointer"
                >
                  Expand all
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-forest transition-colors font-medium cursor-pointer"
                >
                  Collapse all
                </button>
              </div>
            </div>
          </div>
          <p className="m-0 mb-4 text-xs text-muted">
            {statusFilter === "all"
              ? "Every category across all 3 levels, including active and archived."
              : statusFilter === "archived"
              ? "Only archived categories."
              : "Active categories across all 3 levels."} Click any category to expand or collapse its subcategories.
          </p>

          {/* Search Active Notification */}
          {searchResults.active && (
            <div className="mb-3 px-3 py-1.5 bg-sand/40 border border-line rounded-lg text-xs flex items-center justify-between gap-2">
              <span className="text-muted">
                Showing <strong>{searchResults.count}</strong> categories matching “{searchQuery}”
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-forest font-semibold hover:underline text-xs"
              >
                Reset search
              </button>
            </div>
          )}

          {status === "loading" && (
            <div role="status" aria-label="Loading categories" className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          )}

          {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
          {listMessage && <FormMessage tone={listMessage.tone} className="mb-3">{listMessage.text}</FormMessage>}

          {status === "ready" &&
            (visibleCategories.length === 0 ? (
              <div className="py-8 text-center">
                <p className="m-0 text-sm text-muted">
                  {searchQuery
                    ? `No categories match “${searchQuery}”.`
                    : "No categories yet. Add the first one with the form or import from CSV."}
                </p>
                {searchQuery && (
                  <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")} className="mt-2">
                    Clear search filter
                  </Button>
                )}
              </div>
            ) : (
              <DataTable caption="Categories" head={["Category", "Slug", "Products", "Shop", ""]} minWidth={660}>
                {visibleCategories.map((c) => {
                  const level = getCategoryLevel(c, allCategories);
                  const isExpanded = isCategoryExpanded(c.id || c._id);
                  const children = childrenMap.get(String(c.id || c._id)) || [];
                  const childCount = children.length;
                  const hasChildren = childCount > 0;

                  return (
                    <tr
                      key={c.id || c._id}
                      onClick={() => {
                        if (hasChildren) toggleExpand(c.id || c._id);
                      }}
                      className={`transition-colors ${
                        hasChildren ? "cursor-pointer hover:bg-sand/20" : "hover:bg-sand/10"
                      }`}
                    >
                      <td>
                        <div
                          className={`flex items-start gap-2.5 ${
                            level === 2 ? "pl-6 sm:pl-8" : level === 3 ? "pl-12 sm:pl-16" : ""
                          }`}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(c.id || c._id);
                              }}
                              className="w-5 h-5 rounded hover:bg-sand/60 text-muted hover:text-ink flex items-center justify-center transition-colors shrink-0 mt-0.5 cursor-pointer"
                              aria-label={isExpanded ? `Collapse ${c.name}` : `Expand ${c.name}`}
                            >
                              <Icon
                                name="chevron-right"
                                size={13}
                                className={`transition-transform duration-150 ${
                                  isExpanded ? "rotate-90 text-forest" : "text-muted"
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-muted/30 text-xs shrink-0 mt-0.5">•</span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-ink ${
                                  level === 1 ? "font-semibold text-sm" : "font-medium text-sm"
                                }`}
                              >
                                {c.name}
                              </span>
                              {hasChildren && (
                                <span className="text-[11px] text-muted bg-sand/60 px-2 py-0.5 rounded-full font-normal">
                                  {childCount} {level === 1 ? (childCount === 1 ? "subcategory" : "subcategories") : "nested"}
                                </span>
                              )}
                            </div>
                            {c.tagline && (
                              <span className="block text-xs text-muted truncate max-w-sm mt-0.5">{c.tagline}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted font-mono text-xs whitespace-nowrap">/{c.slug}</td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink">{c.activeProductCount ?? 0}</span>
                        <span className="text-muted text-xs"> / {c.productCount ?? 0}</span>
                      </td>
                      <td>
                        <StatusBadge status={categoryStatus(c)} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditCategory(c)}
                          >
                            Edit
                            <span className="sr-only"> {c.name}</span>
                          </Button>
                          {level < 3 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startAddSubcategory(c)}
                              title={`Add subcategory under ${c.name}`}
                            >
                              + Subcategory
                            </Button>
                          )}
                          {!isMainCategory(c) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              disabled={busy !== null}
                              onClick={() => archiveOrRestore(c)}
                            >
                              {c.archivedAt ? "Restore" : "Archive"}
                              <span className="sr-only"> {c.name}</span>
                            </Button>
                          )}
                          {!isMainCategory(c) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="!text-danger hover:bg-red-50 text-xs"
                              disabled={busy !== null}
                              onClick={() => deleteCategory(c)}
                            >
                              Delete
                              <span className="sr-only"> {c.name}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            ))}
        </Card>
      </div>

      {/* Add / Edit Category Popup Modal */}
      {isFormModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFormModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-sand/30 shrink-0">
              <div className="min-w-0">
                <h2 id="category-modal-title" className="text-lg font-bold text-heading truncate">
                  {isNew
                    ? form.parentId && selectedParent
                      ? `Add Subcategory under “${selectedParent.name}”`
                      : "Add New Category"
                    : `Edit “${editing.name}”`}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted">Resulting Level:</span>
                  {determinedLevel === 1 && <Badge tone="forest">Level 1 · Main Category</Badge>}
                  {determinedLevel === 2 && <Badge tone="blue">Level 2 · Subcategory</Badge>}
                  {determinedLevel === 3 && <Badge tone="gold">Level 3 · Nested</Badge>}
                  {selectedParent && (
                    <span className="text-xs text-muted truncate">
                      (under {getHierarchyPath(selectedParent, allCategories)})
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-black/5 transition-colors shrink-0"
                aria-label="Close dialog"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Modal Form & Scrollable Content */}
            <form onSubmit={submit} noValidate className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {serverError && <FormMessage tone="error">{serverError}</FormMessage>}

                {selectedParent && isNew && (
                  <div className="p-3 bg-forest/5 border border-forest/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[0.6875rem] font-bold text-forest uppercase tracking-wider block">
                        Creating Subcategory
                      </span>
                      <span className="text-xs font-semibold text-ink truncate block">
                        Parent: {getHierarchyPath(selectedParent, allCategories)} (Level {parentLevel}) &rarr;{" "}
                        <span className="text-forest font-bold">Level {determinedLevel}</span>
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm((f) => ({ ...f, parentId: "" }))}
                      title="Clear parent"
                    >
                      Clear
                    </Button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Name"
                    name="name"
                    value={form.name}
                    onChange={set("name")}
                    error={errors.name}
                    maxLength={60}
                    required
                    readOnly={!isNew && isMainCategory(editing)}
                    className="sm:col-span-2"
                  />
                  {isNew ? (
                    <TextField
                      label="Slug (optional)"
                      name="slug"
                      value={form.slug}
                      onChange={set("slug")}
                      error={errors.slug}
                      maxLength={80}
                      hint={`URL: /shop/${form.slug || toSlug(form.name) || "…"} — can't be changed later`}
                      className="sm:col-span-2"
                    />
                  ) : (
                    <p className="m-0 text-xs text-muted sm:col-span-2">URL: /shop/{editing.slug}</p>
                  )}

                  {/* Parent Category & Determined Level Display */}
                  <div className="sm:col-span-2">
                    <SelectField
                      label="Parent category"
                      name="parentId"
                      value={form.parentId}
                      onChange={set("parentId")}
                      error={errors.parentId}
                      disabled={!isNew && isMainCategory(editing)}
                      options={parentSelectOptions}
                    />
                    <p className="text-[0.6875rem] text-muted mt-1">
                      {!isNew && isMainCategory(editing)
                        ? `${editing.name} is a canonical root category and must remain a top-level category without a parent.`
                        : determinedLevel === 1
                        ? "Top-level category. Note: Only canonical roots (Plants, Tools, Seeds, Soil & Plant Care) can be top-level categories."
                        : determinedLevel === 2
                        ? `Will be created under ${selectedParent?.name || "selected parent"}.`
                        : `Will be created under ${selectedParent ? getHierarchyPath(selectedParent, allCategories) : "selected parent"}.`}
                    </p>
                  </div>

                  <TextField
                    label="Short name (optional)"
                    name="shortName"
                    value={form.shortName}
                    onChange={set("shortName")}
                    maxLength={40}
                  />
                  <TextField
                    label="Display order"
                    name="displayOrder"
                    type="number"
                    min="0"
                    step="1"
                    value={form.displayOrder}
                    onChange={set("displayOrder")}
                    error={errors.displayOrder}
                  />
                  <TextField
                    label="Tagline (optional)"
                    name="tagline"
                    value={form.tagline}
                    onChange={set("tagline")}
                    maxLength={120}
                    hint="Short line shown on category pages"
                    className="sm:col-span-2"
                  />
                  <TextArea
                    label="Description (optional)"
                    name="description"
                    value={form.description}
                    onChange={set("description")}
                    maxLength={1000}
                    rows={3}
                    className="sm:col-span-2"
                  />
                  <TextField
                    label="Image URL (optional)"
                    name="imageSrc"
                    value={form.imageSrc}
                    onChange={set("imageSrc")}
                    hint="https:// address or a /images/ path"
                    className="sm:col-span-2"
                  />
                  {form.imageSrc.trim() && (
                    <TextField
                      label="Image description"
                      name="imageAlt"
                      value={form.imageAlt}
                      onChange={set("imageAlt")}
                      error={errors.imageAlt}
                      maxLength={200}
                      className="sm:col-span-2"
                    />
                  )}
                  {isNew && (
                    <div className="sm:col-span-2 pt-1">
                      <Checkbox
                        label="Visible in the shop"
                        checked={form.isActive}
                        onChange={set("isActive")}
                      />
                    </div>
                  )}
                  {!isNew && !editing.archivedAt && !isMainCategory(editing) && (
                    <div className="sm:col-span-2 pt-1">
                      <Checkbox
                        label="Visible in the shop"
                        checked={form.isActive}
                        onChange={async (e) => {
                          const isActive = e.target.checked;
                          setForm((f) => ({ ...f, isActive }));
                          try {
                            await authRequest(`/admin/categories/${editing.id}`, { method: "PATCH", body: { isActive } });
                            notify(isActive ? "Category is now visible." : "Category hidden from the shop.");
                            reload();
                          } catch (err) {
                            setForm((f) => ({ ...f, isActive: !isActive }));
                            setServerError(err.message);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-line px-6 py-4 bg-sand/20 flex items-center justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={closeFormModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : isNew ? "Add Category" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CategoryCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => reload()}
      />
    </>
  );
}
