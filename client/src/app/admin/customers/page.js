"use client";

import CustomersTable from "@/features/admin/CustomersTable";
import PageHeader from "@/components/ui/PageHeader";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useAuthedResource } from "@/features/auth/useAuthedResource";

export default function AdminCustomersPage() {
  const { status, data, error, reload } = useAuthedResource("/admin/customers");

  return (
    <>
      <PageHeader title="Customers" subtitle="Customer accounts and their order totals." />
      {status === "loading" && <Skeleton className="h-64" />}
      {status === "error" && (
        <div className="mt-4 space-y-3">
          <FormMessage tone="error">{error?.message || "Customers could not be loaded."}</FormMessage>
          <button type="button" onClick={reload} className="text-sm font-medium text-forest hover:underline">Try again</button>
        </div>
      )}
      {status === "ready" && <CustomersTable customers={data?.customers ?? []} />}
    </>
  );
}
