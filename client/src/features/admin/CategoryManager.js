"use client";

/**
 * CategoryManager — list, add, rename and delete categories (local demo).
 * Categories that still have products can't be deleted.
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { required, validate } from "@/lib/validation";

const toSlug = (s) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CategoryManager({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState({ name: "", tagline: "" });
  const [errors, setErrors] = useState({});
  const [editingSlug, setEditingSlug] = useState(null);
  const { notify } = useToast();

  function submit(e) {
    e.preventDefault();
    const rules = {
      name: [
        required("Category name"),
        (v) => (categories.some((c) => c.slug === toSlug(v) && c.slug !== editingSlug) ? "A category with this name already exists." : ""),
      ],
    };
    const result = validate(form, rules);
    setErrors(result.errors);
    if (!result.isValid) return;
    if (editingSlug) {
      setCategories((list) => list.map((c) => (c.slug === editingSlug ? { ...c, name: form.name, shortName: form.name, tagline: form.tagline } : c)));
      notify(`Category “${form.name}” updated (demo)`);
    } else {
      setCategories((list) => [...list, { slug: toSlug(form.name), name: form.name, shortName: form.name, tagline: form.tagline, productCount: 0 }]);
      notify(`Category “${form.name}” added (demo)`);
    }
    setForm({ name: "", tagline: "" });
    setEditingSlug(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px] items-start">
      <Card className="min-w-0">
        <DataTable caption="Categories" head={["Category", "Slug", "Products", "Actions"]} minWidth={560}>
          {categories.map((c) => (
            <tr key={c.slug}>
              <td>
                <span className="block font-medium text-ink">{c.name}</span>
                <span className="block text-xs text-muted">{c.tagline}</span>
              </td>
              <td className="text-muted">/{c.slug}</td>
              <td className="text-ink">{c.productCount}</td>
              <td>
                <span className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => { setEditingSlug(c.slug); setForm({ name: c.name, tagline: c.tagline ?? "" }); setErrors({}); }}>
                    <Icon name="edit" size={13} />Edit<span className="sr-only"> {c.name}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={c.productCount > 0}
                    title={c.productCount > 0 ? "Move or delete its products first" : undefined}
                    onClick={() => { setCategories((l) => l.filter((x) => x.slug !== c.slug)); notify(`Category “${c.name}” deleted (demo)`); }}
                    aria-label={`Delete ${c.name}`}
                    className="!text-danger hover:!bg-[#fdecea]"
                  >
                    <Icon name="trash" size={15} />
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card>
        <CardHeader title={editingSlug ? "Edit Category" : "Add Category"} />
        <form onSubmit={submit} noValidate className="grid gap-4">
          <TextField label="Name" name="name" value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors({}); }} error={errors.name} hint={form.name ? `Slug: /${toSlug(form.name)}` : undefined} required />
          <TextField label="Tagline" name="tagline" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} hint="Short line shown on category cards" />
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit">{editingSlug ? "Save Changes" : "Add Category"}</Button>
            {editingSlug && <Button variant="outline" onClick={() => { setEditingSlug(null); setForm({ name: "", tagline: "" }); }}>Cancel</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
