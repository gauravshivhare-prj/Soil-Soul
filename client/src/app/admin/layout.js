import { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/States";
import AdminSidebar from "@/components/admin/AdminSidebar";
import RequireAuth from "@/features/auth/RequireAuth";

export const metadata = {
  title: "Admin | Soil & Soul",
  robots: { index: false, follow: false },
};

// Access is enforced by the API (every /admin/* route requires an admin token);
// RequireAuth only keeps signed-out and non-admin visitors from seeing empty screens.
export default function AdminLayout({ children }) {
  return (
    <main className="py-6 sm:py-8">
      <PageContainer>
        {/* The session check reads the URL, which is only known at request time. */}
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RequireAuth role="admin">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr] xl:grid-cols-[250px_1fr] lg:gap-7 items-start">
              <AdminSidebar />
              <div className="min-w-0">{children}</div>
            </div>
          </RequireAuth>
        </Suspense>
      </PageContainer>
    </main>
  );
}
