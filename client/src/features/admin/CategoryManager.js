"use client";

/**
 * CategoryManager — categories from GET /admin/categories (including inactive and
 * archived), with create (POST), edit (PATCH /:id) and archive/restore. Categories are
 * archived, never deleted; the API refuses to archive one that still has active products.
 * Supports strict 3-level category hierarchy (Main -> Subcategory -> Second-level subcategory)
 * and bulk CSV import with validation and preview.
 */

import { useState, useMemo } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { Checkbox, SelectField, TextField } from "@/components/ui/Field";
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
  const isMainCategory = (category) =>
    Boolean(category && !category.parent && CANONICAL_ROOT_SLUGS.includes(category.slug));

  const allCategories = useMemo(() => data?.categories ?? [], [data?.categories]);

  // Hierarchical list of categories for table rendering
  const displayCategories = useMemo(() => buildCategoryTree(allCategories), [allCategories]);

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
    const options = [
      { value: "", label: "Main Category (Level 1)" },
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
  }, [parentOptions, allCategories, form.parentId]);

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

  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setServerError(null);
  };

  const startAddSubcategory = (parentCategory) => {
    setEditing(null);
    setForm({
      ...EMPTY,
      parentId: String(parentCategory.id || parentCategory._id),
    });
    setErrors({});
    setServerError(null);
  };

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
      <div className="grid gap-5 xl:grid-cols-[1fr_360px] items-start">
        <Card className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <CardHeader title="Catalogue categories" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={triggerTemplateDownload}>
                <Icon name="arrow-right" size={13} className="rotate-90" /> Download CSV Template
              </Button>
              <Button size="sm" variant="primary" onClick={() => setIsCsvModalOpen(true)}>
                <Icon name="plus" size={13} /> Import Categories CSV
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>
                <Icon name="plus" size={13} /> Add Category
              </Button>
            </div>
            <SelectField
              label="Show"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "active", label: "Active categories" },
                { value: "archived", label: "Archived categories" },
                { value: "all", label: "All categories" },
              ]}
            />
          </div>

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
            (displayCategories.length === 0 ? (
              <p className="m-0 text-sm text-muted">No categories yet. Add the first one with the form or import from CSV.</p>
            ) : (
              <DataTable caption="Categories" head={["Category", "Slug", "Products", "Status", "Actions"]} minWidth={640}>
                {displayCategories.map((c) => {
                  const level = getCategoryLevel(c, allCategories);
                  const path = getHierarchyPath(c, allCategories);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className={`flex items-start gap-2 ${level === 2 ? "pl-5 sm:pl-7" : level === 3 ? "pl-10 sm:pl-14" : ""}`}>
                          {level > 1 && (
                            <span className="text-muted font-mono select-none text-xs mt-0.5">
                              {level === 2 ? "↳" : "↳ ↳"}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`block text-ink ${level === 1 ? "font-bold text-[0.9375rem]" : level === 2 ? "font-semibold text-sm" : "text-sm"}`}>
                                {c.name}
                              </span>
                              {level === 1 && <Badge tone="forest">Level 1 · Main</Badge>}
                              {level === 2 && <Badge tone="blue">Level 2 · Subcategory</Badge>}
                              {level === 3 && <Badge tone="gold">Level 3 · Nested</Badge>}
                            </div>
                            {level > 1 && (
                              <span className="block text-[0.6875rem] text-muted">{path}</span>
                            )}
                            {c.tagline && <span className="block text-xs text-muted truncate max-w-sm">{c.tagline}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted font-mono text-xs">/{c.slug}</td>
                      <td className="text-ink whitespace-nowrap">{c.activeProductCount} active / {c.productCount}</td>
                      <td><StatusBadge status={categoryStatus(c)} /></td>
                      <td>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm(toForm(c)); setErrors({}); setServerError(null); }}>
                            <Icon name="edit" size={13} />Edit<span className="sr-only"> {c.name}</span>
                          </Button>
                          {level < 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="!text-forest font-medium"
                              onClick={() => startAddSubcategory(c)}
                              title={`Add subcategory under ${c.name}`}
                            >
                              <Icon name="plus" size={13} />Subcategory
                            </Button>
                          )}
                          {!isMainCategory(c) && (
                            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => archiveOrRestore(c)}>
                              {c.archivedAt ? "Restore" : "Archive"}<span className="sr-only"> {c.name}</span>
                            </Button>
                          )}
                          {!isMainCategory(c) && (
                            <Button size="sm" variant="ghost" className="!text-danger" disabled={busy !== null} onClick={() => deleteCategory(c)}>
                              <Icon name="trash" size={14} />Delete<span className="sr-only"> {c.name}</span>
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            ))}
        </Card>

        {/* Add / Edit Category Form */}
        <Card>
          <CardHeader
            title={
              isNew
                ? form.parentId && selectedParent
                  ? `Add Subcategory under “${selectedParent.name}”`
                  : "Add Category"
                : `Edit “${editing.name}”`
            }
            action={
              !isNew && (
                <Button size="sm" variant="outline" onClick={reset}>
                  <Icon name="plus" size={13} /> Add Category
                </Button>
              )
            }
          />
          <form onSubmit={submit} noValidate className="grid gap-4">
            {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={set("name")}
              error={errors.name}
              maxLength={60}
              required
              readOnly={!isNew && isMainCategory(editing)}
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
              />
            ) : (
              <p className="m-0 text-sm text-muted">URL: /shop/{editing.slug}</p>
            )}
            <TextField label="Short name (optional)" name="shortName" value={form.shortName} onChange={set("shortName")} maxLength={40} />
            <TextField label="Tagline (optional)" name="tagline" value={form.tagline} onChange={set("tagline")} maxLength={120} hint="Short line shown on category pages" />
            <TextField label="Description (optional)" name="description" value={form.description} onChange={set("description")} maxLength={1000} />

            {/* Parent Category & Determined Level Display */}
            <div>
              <SelectField
                label="Parent category"
                name="parentId"
                value={form.parentId}
                onChange={set("parentId")}
                disabled={!isNew && isMainCategory(editing)}
                options={parentSelectOptions}
              />
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted">Resulting Level:</span>
                {determinedLevel === 1 && <Badge tone="forest">Level 1 · Main Category</Badge>}
                {determinedLevel === 2 && <Badge tone="blue">Level 2 · Subcategory</Badge>}
                {determinedLevel === 3 && <Badge tone="gold">Level 3 · Second-Level Subcategory</Badge>}
              </div>
              <p className="text-[0.6875rem] text-muted mt-1">
                {!isNew && isMainCategory(editing)
                  ? `${editing.name} is a canonical root category and must remain a top-level category without a parent.`
                  : determinedLevel === 1
                  ? "Top-level category. Note: Only canonical roots (Plants, Tools, Seeds, Natural Products) can be top-level categories."
                  : determinedLevel === 2
                  ? `Will be created under ${selectedParent?.name || "selected parent"}.`
                  : `Will be created under ${selectedParent ? getHierarchyPath(selectedParent, allCategories) : "selected parent"}.`}
              </p>
              {!isNew && getCategoryLevel(editing, allCategories) < 3 && (
                <div className="mt-2.5 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-line">
                  <p className="m-0 text-xs text-muted">
                    Want to add a subcategory under <strong>{editing.name}</strong>?
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startAddSubcategory(editing)}
                  >
                    <Icon name="plus" size={12} /> Add Subcategory
                  </Button>
                </div>
              )}
            </div>

            <TextField label="Display order" name="displayOrder" type="number" min="0" step="1" value={form.displayOrder} onChange={set("displayOrder")} error={errors.displayOrder} />
            <TextField label="Image URL (optional)" name="imageSrc" value={form.imageSrc} onChange={set("imageSrc")} hint="https:// address or a /images/ path" />
            {form.imageSrc.trim() && <TextField label="Image description" name="imageAlt" value={form.imageAlt} onChange={set("imageAlt")} error={errors.imageAlt} maxLength={200} />}
            {isNew && <Checkbox label="Visible in the shop" checked={form.isActive} onChange={set("isActive")} />}
            {!isNew && !editing.archivedAt && !isMainCategory(editing) && (
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
            )}
            <div className="flex flex-wrap gap-2.5">
              <Button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving…" : isNew ? "Add Category" : "Save Changes"}</Button>
              {!isNew && <Button variant="outline" onClick={reset}>Cancel</Button>}
            </div>
          </form>
        </Card>
      </div>

      {/* CSV Import Modal */}
      <CategoryCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => reload()}
      />
    </>
  );
}
