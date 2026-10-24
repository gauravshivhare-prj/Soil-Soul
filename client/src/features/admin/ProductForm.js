"use client";

/**
 * ProductForm — create (POST /admin/products) or edit (PATCH /admin/products/:id) a product.
 *
 * Covers the core listing fields, images (https:// or /images/ addresses), highlights,
 * tags and visibility. Stock is set only when creating; afterwards it changes through
 * Inventory adjustments and orders so every change has a history record. Options, care
 * and specs aren't edited here and are left unchanged on save. The API validates everything again.
 */

import { useState } from "react";
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

function initialValues(p) {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    categoryId: p?.category ?? "",
    sku: p?.sku ?? "",
    price: p ? String(p.price) : "",
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
    images: (p?.images ?? []).map((img) => ({ src: img.src ?? "", alt: img.alt ?? "" })),
  };
}

function check(values, isNew) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter a name of at least 2 characters.";
  if (isNew && values.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) errors.slug = "Use lowercase letters, numbers and hyphens.";
  if (!values.categoryId) errors.categoryId = "Choose a category.";
  if (values.sku.trim() && values.sku.trim().length < 2) errors.sku = "SKU must be at least 2 characters.";
  if (!isMoney(values.price) || Number(values.price) <= 0) errors.price = "Enter a price, e.g. 499 or 499.50.";
  if (values.mrp.trim() && (!isMoney(values.mrp) || Number(values.mrp) < Number(values.price))) errors.mrp = "MRP must be an amount not lower than the price (or left empty).";
  if (isNew && !/^\d+$/.test(values.stock.trim())) errors.stock = "Enter a whole number (0 or more).";
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
    price: Number(values.price),
    mrp: values.mrp.trim() ? Number(values.mrp) : null,
    summary: values.summary.trim(),
    description: values.description.trim(),
    highlights: lines(values.highlights),
    tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
    light: values.light || null,
    size: values.size || null,
    isFeatured: values.isFeatured,
    isActive: values.isActive,
    images: values.images.map((img) => ({ src: img.src.trim(), alt: img.alt.trim() })),
  };
  if (isNew) {
    body.slug = values.slug.trim() || toSlug(values.name);
    body.stock = Number(values.stock);
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
      router.push("/admin/products");
    } catch (err) {
      setServerError(err.message);
      setIsBusy(false);
    }
  }

  // Archived categories can't take products; keep the current one listed when editing.
  const categoryOptions = (categories.data?.categories ?? []).filter((c) => !c.archivedAt || c.id === values.categoryId);
  const preview = values.images.find((img) => /^(https:\/\/|\/images\/)/.test(img.src.trim()));

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
            <TextField label="Price (₹)" name="price" type="number" inputMode="decimal" min="0.01" step="0.01" value={values.price} onChange={set("price")} error={errors.price} required />
            <TextField label="MRP (₹)" name="mrp" type="number" inputMode="decimal" step="0.01" value={values.mrp} onChange={set("mrp")} error={errors.mrp} hint="Optional — shows a discount" />
            {isNew ? (
              <TextField label="Opening stock" name="stock" type="number" inputMode="numeric" min="0" step="1" value={values.stock} onChange={set("stock")} error={errors.stock} required />
            ) : (
              <div className="text-sm">
                <p className="m-0 font-medium text-ink">Stock: {product.stock}</p>
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
                <Button
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
      </div>

      <div className="grid gap-5 content-start">
        <Card>
          <CardHeader title="Preview Image" />
          <ProductImage image={preview ? { src: preview.src.trim(), alt: preview.alt } : null} className="aspect-square" rounded="rounded-xl" sizes="340px" />
        </Card>
        <Card>
          <CardHeader title="Visibility" />
          <div className="grid gap-3">
            {product?.archivedAt ? (
              <p className="m-0 text-sm text-muted">Archived — restore it from the product list to make it visible again.</p>
            ) : (
              <Checkbox label="Visible in the shop" checked={values.isActive} onChange={set("isActive")} />
            )}
            <Checkbox label="Show in Featured Products" checked={values.isFeatured} onChange={set("isFeatured")} />
          </div>
        </Card>
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={isBusy}><Icon name="check" size={16} />{isBusy ? "Saving…" : isNew ? "Create Product" : "Save Changes"}</Button>
          <Button variant="outline" href="/admin/products">Cancel</Button>
        </div>
      </div>
    </form>
  );
}
