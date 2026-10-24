import LoginForm from "@/features/auth/LoginForm";
import { brandSerif } from "@/app/fonts";
import BotanicalSprig from "@/components/ui/BotanicalSprig";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Admin Login | Soil & Soul",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] py-8 sm:py-16">
      <PageContainer className="max-w-[560px]">
        <section className="relative overflow-hidden rounded-3xl border border-[#dfe6d7] bg-white px-6 py-8 shadow-[0_14px_44px_rgba(36,69,42,0.1)] sm:px-12 sm:py-12">
          <BotanicalSprig className="-right-10 -top-8 h-40 opacity-25" rotate={18} />
          <div className="relative">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24452a] text-lg text-white" aria-hidden="true">S</span>
              <div>
                <p className={`${brandSerif.className} m-0 text-xl font-bold text-heading`}>Soil &amp; Soul</p>
                <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Administration portal</p>
              </div>
            </div>
            <LoginForm adminOnly />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
