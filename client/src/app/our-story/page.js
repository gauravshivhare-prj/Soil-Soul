import Image from "next/image";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Our Story — Mindful Living & Living Soil | Soil & Soul",
  description:
    "Explore plants, living microbial soil, gardening essentials and natural-care collections crafted for mindful everyday spaces.",
};

const collections = [
  {
    title: "Living Plants",
    text: "Resilient foliage, gentle succulents and air-purifying companions acclimatized for homes, from sunlit sills to quiet corners.",
    href: "/shop/plants",
  },
  {
    title: "Tools & Living Soil",
    text: "Bio-active potting blends, organic vermicompost and forged carbon-steel tools crafted to nurture roots and endure for seasons.",
    href: "/shop/tools",
  },
  {
    title: "Soil & Plant Care",
    text: "Pure organic plant feeds, chemical-free pest care and botanical soil conditioners made to support natural growth.",
    href: "/shop/soil-plant-care",
  },
];

export default function OurStoryPage() {
  return (
    <main className="bg-[#faf8f2] pb-16">
      <PageContainer className="pt-8 sm:pt-12">
        <div className="grid overflow-hidden rounded-3xl border border-[#e8e1d3] bg-[#f2eee3] md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[260px] sm:min-h-[360px]">
            <Image
              src="/images/Nurturing a Sunlit Seedling.png"
              alt="Hands tending a young seedling in soft sunlight"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
            <p className="m-0 text-xs font-medium uppercase tracking-[0.2em] text-[#71816a]">Our Story</p>
            <h1 className={`${brandSerif.className} m-0 mt-3 text-4xl font-semibold leading-tight text-[#24452a] sm:text-5xl`}>
              A place to grow good things
            </h1>
            <p className="m-0 mt-5 max-w-xl text-base leading-relaxed text-[#465343]">
              Soil &amp; Soul was born out of a quiet realization: in a high-speed world, our living spaces need the
              grounding calm of nature. We believe thriving plants don&apos;t require an elusive green thumb—just living,
              microbial soil and thoughtful, time-honoured care.
            </p>
            <p className="m-0 mt-3 max-w-xl text-sm leading-relaxed text-[#596254]">
              From bio-active potting blends and breathable terracotta to hardy indoor foliage and organic nourishment,
              everything is consciously curated to help you slow down and cultivate life at your own pace.
            </p>
            <Link
              href="/shop"
              className="mt-7 inline-flex min-h-11 w-fit items-center rounded-md bg-[#24452a] px-6 text-sm font-medium text-[#f4f1e8] no-underline transition-colors hover:bg-[#1b3520] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#24452a]"
            >
              Explore the shop
            </Link>
          </div>
        </div>

        <section aria-labelledby="story-collections" className="mx-auto max-w-5xl py-14 sm:py-20">
          <p className="m-0 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#71816a]">Rooted in the everyday</p>
          <h2 id="story-collections" className={`${brandSerif.className} m-0 mt-3 text-center text-3xl font-semibold text-[#24452a] sm:text-4xl`}>
            Find your way to grow
          </h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {collections.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#e8e1d3] bg-white p-6 sm:p-7">
                <h3 className={`${brandSerif.className} m-0 text-xl font-semibold text-[#24452a]`}>{item.title}</h3>
                <p className="m-0 mt-3 text-sm leading-relaxed text-[#596254]">{item.text}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex min-h-10 items-center text-sm font-medium text-[#315937] underline decoration-[#a8b19d] underline-offset-4 hover:text-[#1b3520] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
                >
                  Browse collection <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
