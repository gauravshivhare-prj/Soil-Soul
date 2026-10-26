"use client";

import { Suspense, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createPersistedStore } from "@/lib/persistedStore";
import { PageContainer } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/States";
import AdminSidebar from "@/components/admin/AdminSidebar";
import RequireAuth from "@/features/auth/RequireAuth";

// Whether the admin menu is collapsed, remembered on this device. The server render (and
// hydration) always uses the expanded layout; a saved preference applies right after.
const menuStore = createPersistedStore("soilsoul.admin.menuCollapsed.v1", false, (v) => (typeof v === "boolean" ? v : null));

export default function AdminRouteFrame({ children }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(menuStore.subscribe, menuStore.getSnapshot, menuStore.getServerSnapshot);

  if (pathname === "/admin/login") return children;

  return (
    <main className="min-h-[calc(100vh-2rem)] bg-[#f7f8f3] py-6 sm:py-8">
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RequireAuth role="admin">
            <div
              className={`grid grid-cols-1 items-start gap-5 lg:gap-7 transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${
                collapsed ? "lg:grid-cols-[68px_1fr]" : "lg:grid-cols-[230px_1fr] xl:grid-cols-[250px_1fr]"
              }`}
            >
              <AdminSidebar collapsed={collapsed} onToggle={() => menuStore.set(!collapsed)} />
              <div className="min-w-0">{children}</div>
            </div>
          </RequireAuth>
        </Suspense>
      </PageContainer>
    </main>
  );
}
