"use client";

/**
 * CategoryManager — categories from GET /admin/categories (including inactive and
 * archived), with create (POST), edit (PATCH /:id) and archive/restore. Categories are
 * archived, never deleted; the API refuses to archive one that still has active products.
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/Badge";
import { Checkbox, SelectField, TextField } from "@/components/ui/Field";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";

const toSlug = (s) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const EMPTY = { name: "", slug: "", shortName: "", tagline: "", description: "", displayOrder: "0", imageSrc: "", imageAlt: "", parentId: "", isActive: true };

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
    parentId: c.parent?.id ?? c.parent?._id ?? "",
    isActive: Boolean(c.isActive),
  };
}

function validateForm(form, isNew) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Enter a name of at least 2 characters.";
  if (isNew && form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) errors.slug = "Use lowercase letters, numbers and hyphens.";
  if (!/^\d+$/.test(form.displayOrder.trim())) errors.displayOrder = "Enter a whole number (0 or more).";
  if (form.imageSrc.trim() && form.imageAlt.trim().length < 2) errors.imageAlt = "Describe the image (at least 2 characters).";
  return errors;
}

function toBody(form, isNew) {
  const body = {
    name: form.name.trim(),
    shortName: form.shortName.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    displayOrder: Number(form.displayOrder.trim()),
    image: form.imageSrc.trim() ? { src: form.imageSrc.trim(), alt: form.imageAlt.trim() } : null,
    parentId: form.parentId || null,
  };
  if (isNew) {
    body.slug = form.slug.trim() || toSlug(form.name);
    if (!body.image) delete body.image;
    body.isActive = form.isActive;
  }
  return body;
}

export default function CategoryManager() {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const { status, data, error, reload } = useAuthedResource("/admin/categories?limit=100");
  const [editing, setEditing] = useState(null); // null = adding; else the category
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(null);

  const isNew = editing === null;
  const parentOptions = (data?.categories ?? []).filter((c) => c.id !== editing?.id && !c.parent);
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

  async function submit(e) {
    e.preventDefault();
    const found = validateForm(form, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy("save");
    try {
      const path = isNew ? "/admin/categories" : `/admin/categories/${editing.id}`;
      const res = await authRequest(path, { method: isNew ? "POST" : "PATCH", body: toBody(form, isNew) });
      notify(`Category “${res.category.name}” ${isNew ? "added" : "updated"}.`);
      reset();
      reload();
    } catch (err) {
      setServerError(err.message);
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
    <div className="grid gap-5 xl:grid-cols-[1fr_360px] items-start">
      <Card className="min-w-0">
        {status === "loading" && (
          <div role="status" aria-label="Loading categories" className="grid gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        )}
        {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
        {status === "ready" &&
          (data.categories.length === 0 ? (
            <p className="m-0 text-sm text-muted">No categories yet. Add the first one with the form.</p>
          ) : (
            <DataTable caption="Categories" head={["Category", "Slug", "Products", "Status", "Actions"]} minWidth={640}>
              {data.categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="block font-medium text-ink">{c.name}</span>
                    {c.tagline && <span className="block text-xs text-muted">{c.tagline}</span>}
                  </td>
                  <td className="text-muted">/{c.slug}</td>
                  <td className="text-ink whitespace-nowrap">{c.activeProductCount} active / {c.productCount}</td>
                  <td><StatusBadge status={categoryStatus(c)} /></td>
                  <td>
                    <span className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm(toForm(c)); setErrors({}); setServerError(null); }}>
                        <Icon name="edit" size={13} />Edit<span className="sr-only"> {c.name}</span>
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => archiveOrRestore(c)}>
                        {c.archivedAt ? "Restore" : "Archive"}<span className="sr-only"> {c.name}</span>
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          ))}
      </Card>

      <Card>
        <CardHeader title={isNew ? "Add Category" : `Edit “${editing.name}”`} />
        <form onSubmit={submit} noValidate className="grid gap-4">
          {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
          <TextField label="Name" name="name" value={form.name} onChange={set("name")} error={errors.name} maxLength={60} required />
          {isNew ? (
            <TextField label="Slug (optional)" name="slug" value={form.slug} onChange={set("slug")} error={errors.slug} maxLength={80} hint={`URL: /shop/${form.slug || toSlug(form.name) || "…"} — can't be changed later`} />
          ) : (
            <p className="m-0 text-sm text-muted">URL: /shop/{editing.slug}</p>
          )}
          <TextField label="Short name (optional)" name="shortName" value={form.shortName} onChange={set("shortName")} maxLength={40} />
          <TextField label="Tagline (optional)" name="tagline" value={form.tagline} onChange={set("tagline")} maxLength={120} hint="Short line shown on category pages" />
          <TextField label="Description (optional)" name="description" value={form.description} onChange={set("description")} maxLength={1000} />
          <SelectField label="Parent category (optional)" name="parentId" value={form.parentId} onChange={set("parentId")} options={[{ value: "", label: "Main category" }, ...parentOptions.map((c) => ({ value: c.id, label: c.name }))]} />
          <TextField label="Display order" name="displayOrder" type="number" min="0" step="1" value={form.displayOrder} onChange={set("displayOrder")} error={errors.displayOrder} />
          <TextField label="Image URL (optional)" name="imageSrc" value={form.imageSrc} onChange={set("imageSrc")} hint="https:// address or a /images/ path" />
          {form.imageSrc.trim() && <TextField label="Image description" name="imageAlt" value={form.imageAlt} onChange={set("imageAlt")} error={errors.imageAlt} maxLength={200} />}
          {isNew && <Checkbox label="Visible in the shop" checked={form.isActive} onChange={set("isActive")} />}
          {!isNew && !editing.archivedAt && (
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
  );
}
