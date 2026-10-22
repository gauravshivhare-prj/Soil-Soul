import { PageContainer } from "@/components/ui/PageHeader";
import { DemoNotice } from "@/components/ui/States";
import AccountSidebar from "@/features/account/AccountSidebar";
import { getUser } from "@/services/account";

export const metadata = { title: "My Account | Soil & Soul" };

export default function AccountLayout({ children }) {
  const user = getUser();
  return (
    <main className="py-6 sm:py-8 lg:py-10">
      <PageContainer>
        <DemoNotice className="mb-5">
          You&rsquo;re viewing a demo account with sample data. Sign-in, saved details and orders will be connected to your real account later.
        </DemoNotice>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_1fr] xl:grid-cols-[290px_1fr] lg:gap-7 items-start">
          <AccountSidebar user={user} />
          <div className="min-w-0">{children}</div>
        </div>
      </PageContainer>
    </main>
  );
}
