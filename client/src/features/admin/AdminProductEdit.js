"use client";

/**
 * AdminProductEdit — loads one product (GET /admin/products/:id) into ProductForm.
 */

import Link from "next/link";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { AdminHeader } from "@/components/admin/AdminParts";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import ProductForm from "./ProductForm";

export default function AdminProductEdit({ productId }) {
  const { status, data, error } = useAuthedResource(`/admin/products/${encodeURIComponent(productId)}`);

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 mb-2 text-sm text-muted no-underline hover:text-forest">
        <Icon name="arrow-left" size={15} /> Back to products
      </Link>
      {status === "loading" && (
        <div role="status" aria-label="Loading product" className="grid gap-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {status === "error" &&
        (error.status === 404 || error.status === 400 ? (
          <EmptyState icon="box" title="Product not found" action={<Button href="/admin/products">Back to Products</Button>} />
        ) : (
          <FormMessage tone="error">{error.message}</FormMessage>
        ))}
      {status === "ready" && (
        <>
          <AdminHeader title={`Edit: ${data.product.name}`} subtitle={`/${data.product.slug}`} />
          <ProductForm key={data.product.id} product={data.product} />
        </>
      )}
    </div>
  );
}
