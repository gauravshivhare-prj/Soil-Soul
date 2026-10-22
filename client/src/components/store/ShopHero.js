/**
 * ShopHero — page banner for Shop, category and collection pages.
 *
 * Lifestyle photography isn't connected yet, so the banner is a warm cream
 * band with the botanical sprig contained on its right edge (lg+).
 */

import { Breadcrumbs, PageContainer, PageTitle } from "@/components/ui/PageHeader";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

export default function ShopHero({ title, description, breadcrumbs }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-gradient-to-r from-sand via-[#f6f1e6] to-sage-50">
      <BotanicalSprig className="hidden lg:block right-[4%] -bottom-[18%] h-[150%] opacity-70" flip rotate={-12} eager />
      <PageContainer className="relative py-7 sm:py-9 lg:py-11">
        <Breadcrumbs items={breadcrumbs} className="mb-3" />
        <PageTitle>{title}</PageTitle>
        {description && <p className="m-0 mt-2 max-w-xl text-sm sm:text-[0.9375rem] leading-relaxed text-body">{description}</p>}
      </PageContainer>
    </section>
  );
}
