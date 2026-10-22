import { PageContainer } from "@/components/ui/PageHeader";
import { DemoNotice } from "@/components/ui/States";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getAdminProfile } from "@/services/admin";

export const metadata = {
  title: "Admin | Soil & Soul",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return (
    <main className="py-6 sm:py-8">
      <PageContainer>
        <DemoNotice className="mb-5">
          Admin demo with sample data. This panel is <strong>not secured</strong> — real access will require server-side authentication and admin authorization. Changes here are local only and reset on reload.
        </DemoNotice>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr] xl:grid-cols-[250px_1fr] lg:gap-7 items-start">
          <AdminSidebar profile={getAdminProfile()} />
          <div className="min-w-0">{children}</div>
        </div>
      </PageContainer>
    </main>
  );
}
