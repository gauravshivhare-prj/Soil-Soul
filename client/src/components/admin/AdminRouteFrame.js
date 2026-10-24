"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/States";
import AdminSidebar from "@/components/admin/AdminSidebar";
import RequireAuth from "@/features/auth/RequireAuth";

export default function AdminRouteFrame({ children }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return children;

  return (
    <main className="min-h-[calc(100vh-2rem)] bg-[#f7f8f3] py-6 sm:py-8">
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RequireAuth role="admin">
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[230px_1fr] lg:gap-7 xl:grid-cols-[250px_1fr]">
              <AdminSidebar />
              <div className="min-w-0">{children}</div>
            </div>
          </RequireAuth>
        </Suspense>
      </PageContainer>
    </main>
  );
}
