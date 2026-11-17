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
    icon: "🪴",
    text: "Resilient foliage, gentle succulents and air-purifying companions acclimatized for Indian homes, from sunlit sills to quiet corners.",
    href: "/shop/plants",
  },
  {
    title: "Handcrafted Tools",
    icon: "⚒️",
    text: "Forged carbon-steel trowels, precision pruners and balanced watering cans crafted to nurture roots and endure for seasons.",
    href: "/shop/tools",
  },
  {
    title: "Soil & Plant Care",
    icon: "🌱",
    text: "Bio-active potting blends, 90-day aged vermicompost, seaweed extracts and chemical-free pest care made to support natural growth.",
    href: "/shop/soil-plant-care",
  },
];

const TIMELINE = [
  {
    year: "2021",
    title: "A Terrace in Bengaluru",
    text: "Started on a humble balcony potting bench with a single mission: bring organic, chemical-free living soil to urban plant lovers.",
  },
  {
    year: "2023",
    title: "The Living Soil Formula",
    text: "Engineered our proprietary mycorrhizal fungi and biochar inoculant, cutting indoor plant mortality by over 60%.",
  },
  {
    year: "2025",
    title: "100% Plastic-Free Packaging",
    text: "Eliminated single-use bubble wraps and plastic pots, replacing them with breathable coco-coir mesh and honeycomb sleeves.",
  },
  {
    year: "2026",
    title: "50,000+ Thriving Plant Homes",
    text: "Now nurturing homes across every state in India with express botanical transit and Sprout AI plant doctor care.",
  },
];

const METRICS = [
  { value: "50,000+", label: "Plants Nurtured", icon: "🌿" },
  { value: "100%", label: "Plastic-Free Packaging", icon: "📦" },
  { value: "7 Days", label: "Healthy Plant Guarantee", icon: "🪴" },
  { value: "4.9 ★", label: "Botanical Rating", icon: "⭐" },
];

export default function OurStoryPage() {
  return (
    <main className="bg-[#faf8f2] pb-20">
      <PageContainer className="pt-8 sm:pt-12">
        {/* Hero Banner with Entrance Animation */}
        <div className="grid overflow-hidden rounded-3xl border border-[#e8e1d3] bg-[#f2eee3] md:grid-cols-[1.05fr_0.95fr] shadow-xs motion-safe:animate-fade-up">
          <div className="relative min-h-[280px] sm:min-h-[420px] overflow-hidden group">
            <Image
              src="/images/Nurturing a Sunlit Seedling.png"
              alt="Hands tending a young seedling in soft sunlight"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Floating Botanical Badge with subtle bobbing */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-line shadow-md flex items-center gap-2.5 transition-transform hover:scale-105">
              <span className="text-xl">🌱</span>
              <div>
                <p className="m-0 text-[11px] font-bold text-forest">Grown with Care</p>
                <p className="m-0 text-[10px] text-muted">100% Organic Living Soils</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">Our Story</p>
            <h1 className={`${brandSerif.className} m-0 mt-3 text-4xl font-bold leading-tight text-[#24452a] sm:text-5xl`}>
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
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#24452a] px-6 text-sm font-medium text-[#f4f1e8] no-underline transition-all hover:bg-[#1b3520] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#24452a]"
              >
                Explore the Shop →
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-medium text-ink no-underline transition-colors hover:border-forest/50"
              >
                Visit Our Nursery
              </Link>
            </div>
          </div>
        </div>

        {/* Animated Metrics Bar */}
        <section aria-label="Our Achievements" className="py-12 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-line bg-white p-5 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-2xl mb-1 block" aria-hidden="true">
                  {m.icon}
                </span>
                <span className={`${brandSerif.className} text-2xl sm:text-3xl font-bold text-forest block`}>
                  {m.value}
                </span>
                <span className="text-xs text-muted font-medium mt-1 block">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Collections Cards with Hover Micro-Interactions */}
        <section aria-labelledby="story-collections" className="mx-auto max-w-5xl py-8">
          <p className="m-0 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">
            Rooted in the everyday
          </p>
          <h2 id="story-collections" className={`${brandSerif.className} m-0 mt-3 text-center text-3xl font-bold text-[#24452a] sm:text-4xl`}>
            Find your way to grow
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {collections.map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-[#e8e1d3] bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-forest/30 flex flex-col"
              >
                <span className="text-3xl mb-3 block transform transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>
                <h3 className={`${brandSerif.className} m-0 text-xl font-bold text-[#24452a]`}>{item.title}</h3>
                <p className="m-0 mt-2.5 text-sm leading-relaxed text-[#596254] flex-1">{item.text}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center text-sm font-semibold text-[#315937] group-hover:text-forest no-underline"
                >
                  Browse collection <span aria-hidden="true" className="ml-1.5 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Interactive Milestones Timeline */}
        <section aria-label="Our Journey" className="mx-auto max-w-4xl py-14">
          <div className="text-center mb-10">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">How We Bloomed</p>
            <h2 className={`${brandSerif.className} m-0 mt-2 text-3xl sm:text-4xl font-bold text-[#24452a]`}>
              Our Growing Journey
            </h2>
          </div>

          <div className="relative border-l-2 border-forest/30 ml-4 sm:ml-32 space-y-8 pl-6 sm:pl-8">
            {TIMELINE.map((step) => (
              <div key={step.year} className="relative group">
                {/* Node dot */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-forest border-4 border-[#faf8f2] shadow-sm transition-transform duration-200 group-hover:scale-125" />
                <span className="hidden sm:block absolute -left-28 top-0.5 text-base font-bold text-forest">
                  {step.year}
                </span>
                <span className="sm:hidden text-xs font-bold text-forest block mb-0.5">
                  Year {step.year}
                </span>
                <div className="rounded-xl border border-line bg-white p-5 shadow-xs transition-all duration-300 group-hover:border-forest/40 group-hover:shadow-sm">
                  <h4 className={`${brandSerif.className} m-0 text-base sm:text-lg font-bold text-ink`}>{step.title}</h4>
                  <p className="m-0 mt-1.5 text-xs sm:text-sm text-muted leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Botanical Quote Banner */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-forest text-cream p-8 sm:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="text-4xl mb-3 opacity-30 select-none">❝</div>
          <blockquote className={`${brandSerif.className} m-0 text-xl sm:text-2xl font-medium leading-relaxed italic text-white/95`}>
            To plant a garden is to believe in tomorrow. Healthy roots in living soil create resilient life anywhere.
          </blockquote>
          <p className="m-0 mt-4 text-xs tracking-widest uppercase text-sage-100/80 font-semibold">
            — Soil &amp; Soul Nursery Philosophy
          </p>
        </div>
      </PageContainer>
    </main>
  );
}
