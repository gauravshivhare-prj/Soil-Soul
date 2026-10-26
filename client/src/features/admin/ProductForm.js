"use client";

/**
 * ProductForm — create (POST /admin/products) or edit (PATCH /admin/products/:id) a product.
 *
 * Covers the core listing fields, images (https:// or /images/ addresses), highlights,
 * tags and visibility. Stock is set only when creating; afterwards it changes through
 * Inventory adjustments and orders so every change has a history record. Options, care
 * and specs aren't edited here and are left unchanged on save. The API validates everything again.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import ProductImage from "@/components/ui/ProductImage";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { productHref } from "@/lib/routes";

const toSlug = (s) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isMoney = (v) => /^\d+(\.\d{1,2})?$/.test(String(v).trim());
const lines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const LIGHT = [{ value: "", label: "Not set" }, { value: "low", label: "Low light" }, { value: "bright-indirect", label: "Bright indirect" }, { value: "full-sun", label: "Full sun" }];
const SIZE = [{ value: "", label: "Not set" }, { value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }];

/* Stored images in display order with exactly one primary (the stored primary, else the first). */
function loadImages(images) {
  const sorted = [...(images ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const primary = Math.max(0, sorted.findIndex((img) => img.isPrimary));
  return sorted.map((img, i) => ({ src: img.src ?? "", alt: img.alt ?? "", isPrimary: i === primary, sortOrder: i }));
}

function initialValues(p) {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    categoryId: p?.category ?? "",
    sku: p?.sku ?? "",
    price: p?.price != null ? String(p.price) : "",
    mrp: p?.mrp != null ? String(p.mrp) : "",
    stock: p ? String(p.stock) : "0",
    summary: p?.summary ?? "",
    description: p?.description ?? "",
    highlights: (p?.highlights ?? []).join("\n"),
    tags: (p?.tags ?? []).join(", "),
    light: p?.light ?? "",
    size: p?.size ?? "",
    isFeatured: p?.isFeatured ?? false,
    isActive: p?.isActive ?? true,
    status: p?.status ?? "draft",
    images: loadImages(p?.images),
    options: p?.options
      ? { label: p.options.label ?? "Variant", choices: (p.options.choices ?? []).map((choice) => ({ ...choice, price: choice.price == null ? "" : String(choice.price), mrp: choice.mrp == null ? "" : String(choice.mrp), stock: choice.stock == null ? "" : String(choice.stock), stored: true })) }
      : { label: "Variant", choices: [] },
  };
}

function check(values, isNew) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter a name of at least 2 characters.";
  if (isNew && values.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) errors.slug = "Use lowercase letters, numbers and hyphens.";
  if (!values.categoryId) errors.categoryId = "Choose a category.";
  if (values.sku.trim() && values.sku.trim().length < 2) errors.sku = "SKU must be at least 2 characters.";
  if (values.status !== "draft" && (!isMoney(values.price) || Number(values.price) <= 0)) errors.price = "Enter a price for an active product.";
  if (values.mrp.trim() && (!isMoney(values.mrp) || Number(values.mrp) < Number(values.price))) errors.mrp = "MRP must be an amount not lower than the price (or left empty).";
  if (isNew && values.status !== "draft" && !/^\d+$/.test(values.stock.trim())) errors.stock = "Enter a whole number (0 or more).";
  values.images.forEach((img, i) => {
    if (!img.src.trim()) errors[`image${i}`] = "Enter the image address or remove this image.";
    else if (!/^(https:\/\/|\/images\/)/.test(img.src.trim())) errors[`image${i}`] = "Use an https:// address or a /images/ path.";
    else if (img.alt.trim().length < 2) errors[`image${i}`] = "Describe the image (at least 2 characters).";
  });
  return errors;
}

function toBody(values, isNew) {
  const body = {
    name: values.name.trim(),
    categoryId: values.categoryId,
    sku: values.sku.trim() || null,
    price: values.price.trim() === "" ? null : Number(values.price),
    mrp: values.mrp.trim() ? Number(values.mrp) : null,
    summary: values.summary.trim(),
    description: values.description.trim(),
    highlights: lines(values.highlights),
    tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
    light: values.light || null,
    size: values.size || null,
    isFeatured: values.isFeatured,
    isActive: values.isActive,
    images: values.images.map((img, index) => ({ src: img.src.trim(), alt: img.alt.trim(), isPrimary: Boolean(img.isPrimary), sortOrder: index })),
    status: values.status,
    options: values.options.choices.length
      ? {
          label: values.options.label.trim() || "Variant",
          choices: values.options.choices.map((choice) => ({
            id: choice.id.trim(),
            name: choice.name.trim(),
            detail: choice.detail?.trim() || "",
            priceDelta: 0,
            sku: choice.sku?.trim() || undefined,
            price: choice.price === "" ? null : Number(choice.price),
            mrp: choice.mrp === "" ? null : Number(choice.mrp),
            stock: choice.stock === "" ? null : Number(choice.stock),
            weight: choice.weight?.trim() || undefined,
            volume: choice.volume?.trim() || undefined,
            isActive: choice.isActive !== false,
          })),
        }
      : null,
  };
  if (isNew) {
    body.slug = values.slug.trim() || toSlug(values.name);
    body.stock = values.stock.trim() === "" ? null : Number(values.stock);
    if (body.sku === null) delete body.sku;
    if (body.mrp === null) delete body.mrp;
  }
  return body;
}

export default function ProductForm({ product }) {
  const router = useRouter();
  const { notify } = useToast();
  const { authRequest } = useAuth();
  const categories = useAuthedResource("/admin/categories?limit=100");
  const isNew = !product;
  const [values, setValues] = useState(() => initialValues(product));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  // Set once the server has saved, while the product list opens (that can take a moment in dev).
  const [saved, setSaved] = useState(false);

  // Safety net: if the client-side navigation to the list doesn't happen (e.g. the dev server is
  // recompiling or restarting), load the list with a full page navigation instead of leaving the
  // form waiting.
  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => {
      // A full page load is the point here: it only runs when client navigation did not happen.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (window.location.pathname !== "/admin/products") window.location.assign("/admin/products");
    }, 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };
  const setImage = (i, field) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, images: v.images.map((img, j) => (j === i ? { ...img, [field]: value } : img)) }));
    setErrors((x) => ({ ...x, [`image${i}`]: "" }));
  };
  const setChoice = (i, field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, options: { ...v.options, choices: v.options.choices.map((choice, j) => (j === i ? { ...choice, [field]: value } : choice)) } }));
  };
  const makePrimary = (i) => setValues((v) => ({ ...v, images: v.images.map((img, j) => ({ ...img, isPrimary: i === j })) }));
  const moveImage = (i, direction) => setValues((v) => {
    const next = [...v.images];
    const target = i + direction;
    if (target < 0 || target >= next.length) return v;
    [next[i], next[target]] = [next[target], next[i]];
    return { ...v, images: next };
  });

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const found = check(values, isNew);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      form.querySelector(`[name="${first.startsWith("image") ? `${first}-src` : first}"]`)?.focus();
      return;
    }
    setIsBusy(true);
    setServerError(null);
    try {
      const path = isNew ? "/admin/products" : `/admin/products/${product.id}`;
      const res = await authRequest(path, { method: isNew ? "POST" : "PATCH", body: toBody(values, isNew) });
      notify(`${res.product.name} ${isNew ? "created" : "saved"}.`);
      setSaved(true);
      router.push("/admin/products");
    } catch (err) {
      setServerError(err.message);
      setIsBusy(false);
    }
  }

  // Archived categories can't take products; keep the current one listed when editing.
  const categoryOptions = (categories.data?.categories ?? []).filter((c) => !c.archivedAt || c.id === values.categoryId);
  const preview = values.images.find((img) => img.isPrimary && /^(https:\/\/|\/images\/)/.test(img.src.trim()))
    ?? values.images.find((img) => /^(https:\/\/|\/images\/)/.test(img.src.trim()));

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-[1fr_340px] items-start">
      <div className="grid gap-5 min-w-0">
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        <Card>
          <CardHeader title="Basic Information" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Product name" name="name" value={values.name} onChange={set("name")} error={errors.name} maxLength={120} required className="sm:col-span-2" />
            {isNew ? (
              <TextField label="URL slug (optional)" name="slug" value={values.slug} onChange={set("slug")} error={errors.slug} maxLength={140} hint={`Shown at /products/${values.slug || toSlug(values.name) || "…"} — can't be changed later`} />
            ) : (
              <p className="m-0 self-end text-sm text-muted">
                URL: <Link href={productHref(product.slug)} className="text-forest">/products/{product.slug}</Link>
              </p>
            )}
            <SelectField
              label="Category"
              name="categoryId"
              value={values.categoryId}
              onChange={set("categoryId")}
              error={errors.categoryId ?? (categories.status === "error" ? categories.error.message : undefined)}
              required
              options={[{ value: "", label: categories.status === "loading" ? "Loading…" : "Select category" }, ...categoryOptions.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (hidden)` }))]}
            />
            <TextField label="SKU (optional)" name="sku" value={values.sku} onChange={set("sku")} error={errors.sku} maxLength={40} />
            <TextField label="Short summary" name="summary" value={values.summary} onChange={set("summary")} maxLength={300} className="sm:col-span-2" />
            <TextArea label="Description" name="description" value={values.description} onChange={set("description")} rows={5} maxLength={5000} className="sm:col-span-2" />
            <TextArea label="Highlights (one per line)" name="highlights" value={values.highlights} onChange={set("highlights")} rows={3} className="sm:col-span-2" />
            <TextField label="Tags (comma-separated)" name="tags" value={values.tags} onChange={set("tags")} className="sm:col-span-2" />
            <SelectField label="Light" name="light" value={values.light} onChange={set("light")} options={LIGHT} />
            <SelectField label="Size" name="size" value={values.size} onChange={set("size")} options={SIZE} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pricing & Stock" />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Price (₹)" name="price" type="number" inputMode="decimal" min="0.01" step="0.01" value={values.price} onChange={set("price")} error={errors.price} required={values.status !== "draft"} />
            <TextField label="MRP (₹)" name="mrp" type="number" inputMode="decimal" step="0.01" value={values.mrp} onChange={set("mrp")} error={errors.mrp} hint="Optional — shows a discount" />
            {isNew ? (
              <TextField label="Opening stock" name="stock" type="number" inputMode="numeric" min="0" step="1" value={values.stock} onChange={set("stock")} error={errors.stock} required={values.status !== "draft"} />
            ) : (
              <div className="text-sm">
                <p className="m-0 font-medium text-ink">Stock: {product.stock ?? "not set"}</p>
                <Link href="/admin/inventory" className="text-forest text-xs">Adjust in Inventory</Link>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Images" />
          <div className="grid gap-4">
            {values.images.length === 0 && <p className="m-0 text-sm text-muted">No images yet. The shop shows a plain placeholder.</p>}
            {values.images.map((img, i) => (
              <fieldset key={i} className="m-0 p-0 border-0 grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-start">
                <legend className="sr-only">Image {i + 1}</legend>
                <TextField label={`Image ${i + 1} address`} name={`image${i}-src`} value={img.src} onChange={setImage(i, "src")} error={errors[`image${i}`]} placeholder="https://… or /images/…" />
                <TextField label="Description" name={`image${i}-alt`} value={img.alt} onChange={setImage(i, "alt")} maxLength={200} />
                <div className="flex items-center gap-1 sm:mt-7">
                  <Button type="button" variant={img.isPrimary ? "primary" : "outline"} size="sm" onClick={() => makePrimary(i)}>{img.isPrimary ? "Primary" : "Make primary"}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move image up">↑</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveImage(i, 1)} disabled={i === values.images.length - 1} aria-label="Move image down">↓</Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:mt-7 !text-danger"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={() => setValues((v) => ({ ...v, images: v.images.filter((_, j) => j !== i) }))}
                >
                  <Icon name="trash" size={15} />
                </Button>
              </fieldset>
            ))}
            {values.images.length < 10 && (
              <div>
                <Button variant="outline" size="sm" onClick={() => setValues((v) => ({ ...v, images: [...v.images, { src: "", alt: "" }] }))}>
                  <Icon name="plus" size={14} /> Add Image
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Variants" />
          <div className="grid gap-3">
            <TextField label="Variant label" value={values.options.label} onChange={(e) => setValues((v) => ({ ...v, options: { ...v.options, label: e.target.value } }))} maxLength={40} />
            {values.options.choices.map((choice, i) => (
              <fieldset key={choice.id || i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2">
                <TextField label="ID" value={choice.id ?? ""} onChange={setChoice(i, "id")} readOnly={Boolean(choice.stored)} hint={choice.stored ? "Fixed once saved (orders and stock history refer to it)." : undefined} />
                <TextField label="Name" value={choice.name ?? ""} onChange={setChoice(i, "name")} />
                <TextField label="SKU" value={choice.sku ?? ""} onChange={setChoice(i, "sku")} />
                <TextField label="Price (₹)" type="number" value={choice.price ?? ""} onChange={setChoice(i, "price")} />
                <TextField label="MRP (₹)" type="number" value={choice.mrp ?? ""} onChange={setChoice(i, "mrp")} />
                {choice.stored ? (
                  // Stock of saved variants changes only through Inventory (with history); the server ignores it here.
                  <div className="text-sm">
                    <p className="m-0 font-medium text-ink">Stock: {choice.stock === "" ? "uses shared product stock" : choice.stock}</p>
                    <Link href="/admin/inventory" className="text-forest text-xs">Adjust in Inventory</Link>
                  </div>
                ) : (
                  <TextField label="Opening stock" type="number" min="0" step="1" value={choice.stock ?? ""} onChange={setChoice(i, "stock")} hint="Later changes go through Inventory." />
                )}
                <TextField label="Weight" value={choice.weight ?? ""} onChange={setChoice(i, "weight")} />
                <TextField label="Volume / capacity" value={choice.volume ?? ""} onChange={setChoice(i, "volume")} />
                <Checkbox label="Available to buy" checked={choice.isActive !== false} onChange={setChoice(i, "isActive")} className="sm:col-span-2" />
                <Button type="button" variant="ghost" className="!text-danger sm:col-span-2" onClick={() => setValues((v) => ({ ...v, options: { ...v.options, choices: v.options.choices.filter((_, j) => j !== i) } }))}>Remove variant</Button>
              </fieldset>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setValues((v) => ({ ...v, options: { ...v.options, choices: [...v.options.choices, { id: `variant-${v.options.choices.length + 1}`, name: "", detail: "", price: "", mrp: "", stock: "", isActive: true }] } }))}>Add variant</Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 content-start">
        <Card>
          <CardHeader title="Preview Image" />
          <ProductImage image={preview ? { src: preview.src.trim(), alt: preview.alt } : null} className="aspect-square" rounded="rounded-xl" sizes="340px" />
        </Card>
        <Card>
          <CardHeader title="Visibility" />
          <div className="grid gap-3">
            <SelectField label="Catalogue status" value={values.status} onChange={set("status")} options={[{ value: "draft", label: "Draft (not purchasable)" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            {product?.archivedAt ? (
              <p className="m-0 text-sm text-muted">Archived — restore it from the product list to make it visible again.</p>
            ) : (
              <Checkbox label="Visible in the shop" checked={values.isActive} onChange={set("isActive")} />
            )}
            <p className="m-0 text-xs text-muted">Shown and purchasable only when the status is Active and &ldquo;Visible in the shop&rdquo; is ticked. Drafts need a price before they can be made Active.</p>
            <Checkbox label="Show in Featured Products" checked={values.isFeatured} onChange={set("isFeatured")} />
          </div>
        </Card>
        {/* Repeated next to the button: the top of the form may be scrolled out of view. */}
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        {saved && <FormMessage tone="success">Saved. Opening the product list…</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={isBusy || saved}><Icon name="check" size={16} />{saved ? "Saved" : isBusy ? "Saving…" : isNew ? "Create Product" : "Save Changes"}</Button>
          <Button variant="outline" href="/admin/products">Cancel</Button>
        </div>
      </div>
    </form>
  );
}
