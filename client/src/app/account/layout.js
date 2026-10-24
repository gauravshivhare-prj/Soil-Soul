import { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/States";
import AccountSidebar from "@/features/account/AccountSidebar";
import RequireAuth from "@/features/auth/RequireAuth";

export const metadata = { title: "My Account | Soil & Soul" };

export default function AccountLayout({ children }) {
  return (
    <main className="py-6 sm:py-8 lg:py-10">
      <PageContainer>
        {/* The session check reads the URL, which is only known at request time. */}
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RequireAuth>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_1fr] xl:grid-cols-[290px_1fr] lg:gap-7 items-start">
              <AccountSidebar />
              <div className="min-w-0">{children}</div>
            </div>
          </RequireAuth>
        </Suspense>
      </PageContainer>
    </main>
  );
}
