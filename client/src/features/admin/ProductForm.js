"use client";

/**
 * ProductForm — create / edit a product (admin demo).
 *
 * Validates on the client and shows a "saved (demo)" confirmation; nothing
 * is persisted. The real API must validate again and enforce admin auth.
 * The image area is a placeholder until uploads are implemented.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCategories, getProducts } from "@/services/catalog";
import { required, validate } from "@/lib/validation";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import ProductImage from "@/components/ui/ProductImage";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const toSlug = (s) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function positiveNumber(label, { allowZero = false } = {}) {
  return (value) => {
    if (value === "" || value == null) return `${label} is required.`;
    const n = Number(value);
    if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) return `${label} must be ${allowZero ? "0 or more" : "greater than 0"}.`;
    if (!Number.isInteger(n)) return `${label} must be a whole number.`;
    return "";
  };
}

export default function ProductForm({ product }) {
  const router = useRouter();
  const { notify } = useToast();
  const categories = getCategories();
  const isNew = !product;

  const [values, setValues] = useState(() => ({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categorySlug: product?.categorySlug ?? "",
    price: product?.price ?? "",
    mrp: product?.mrp ?? "",
    stock: product?.stock ?? "",
    summary: product?.summary ?? "",
    description: product?.description ?? "",
    isFeatured: product?.isFeatured ?? false,
  }));
  const [errors, setErrors] = useState({});
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const rules = {
    name: required("Product name"),
    slug: [
      required("URL slug"),
      (v) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? "" : "Use lowercase letters, numbers and hyphens."),
      (v) => (getProducts().some((p) => p.slug === v && p.slug !== product?.slug) ? "Another product already uses this slug." : ""),
    ],
    categorySlug: required("Category"),
    price: positiveNumber("Price"),
    mrp: (v, all) => (v === "" ? "" : Number(v) > Number(all.price) ? "" : "MRP must be higher than the price (or left empty)."),
    stock: positiveNumber("Stock", { allowZero: true }),
    summary: required("Short summary"),
  };

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value, ...(field === "name" && !slugTouched ? { slug: toSlug(value) } : {}) }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: "" }));
  };

  function submit(e) {
    e.preventDefault();
    const result = validate(values, rules);
    setErrors(result.errors);
    if (!result.isValid) {
      const first = Object.keys(rules).find((f) => result.errors[f]);
      e.currentTarget.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    notify(`${values.name} ${isNew ? "created" : "updated"} (demo — not saved to a server)`);
    router.push("/admin/products");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-[1fr_320px] items-start">
      <div className="grid gap-5 min-w-0">
        <Card>
          <CardHeader title="Basic Information" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Product name" name="name" value={values.name} onChange={set("name")} error={errors.name} required className="sm:col-span-2" />
            <TextField
              label="URL slug"
              name="slug"
              value={values.slug}
              onChange={(e) => { setSlugTouched(true); set("slug")(e); }}
              error={errors.slug}
              hint={`Shown at /products/${values.slug || "…"}`}
              required
            />
            <SelectField
              label="Category"
              name="categorySlug"
              value={values.categorySlug}
              onChange={set("categorySlug")}
              error={errors.categorySlug}
              required
              options={[{ value: "", label: "Select category" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
            />
            <TextField label="Short summary" name="summary" value={values.summary} onChange={set("summary")} error={errors.summary} required className="sm:col-span-2" />
            <TextArea label="Description" name="description" value={values.description} onChange={set("description")} rows={5} className="sm:col-span-2" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pricing & Inventory" />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Price (₹)" name="price" type="number" inputMode="numeric" min="1" value={values.price} onChange={set("price")} error={errors.price} required />
            <TextField label="MRP (₹)" name="mrp" type="number" inputMode="numeric" value={values.mrp ?? ""} onChange={set("mrp")} error={errors.mrp} hint="Optional — shows a discount" />
            <TextField label="Stock" name="stock" type="number" inputMode="numeric" min="0" value={values.stock} onChange={set("stock")} error={errors.stock} required />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 content-start">
        <Card>
          <CardHeader title="Product Image" />
          <ProductImage image={product?.image} className="aspect-square" rounded="rounded-xl">
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted">
              <Icon name="image" size={26} className="text-faint" />
              Image upload coming soon
            </span>
          </ProductImage>
        </Card>
        <Card>
          <CardHeader title="Visibility" />
          <Checkbox label="Show in Featured Products" checked={values.isFeatured} onChange={set("isFeatured")} />
        </Card>
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit"><Icon name="check" size={16} />{isNew ? "Create Product" : "Save Changes"}</Button>
          <Button variant="outline" href="/admin/products">Cancel</Button>
        </div>
      </div>
    </form>
  );
}
