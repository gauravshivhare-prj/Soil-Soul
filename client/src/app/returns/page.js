import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Returns & Exchanges — 7-Day Healthy Plant Guarantee | Soil & Soul",
  description:
    "Learn about our 7-day botanical guarantee, return and replacement guidelines, and how to request a plant or tool exchange.",
};

const GUARANTEE_POINTS = [
  {
    icon: "🪴",
    title: "7-Day Healthy Plant Guarantee",
    text: "Plants travel in custom breathable coco-husk sleeves. If your plant arrives damaged or unhealthy, we replace it free within 7 days of delivery.",
  },
  {
    icon: "🔄",
    title: "Free Easy Exchanges",
    text: "Need a different pot size or plant companion? You can request an exchange directly from your account order details page.",
  },
  {
    icon: "📦",
    title: "Plastic-Free Returns",
    text: "For gardening tools and unopened soil/fertiliser packs, our delivery partner arranges an eco-pickup right from your doorstep.",
  },
  {
    icon: "💳",
    title: "Fast Refund Processing",
    text: "For Cash on Delivery orders, refunds are credited directly to your registered bank account or UPI within 48 hours of return receipt.",
  },
];

const FAQS = [
  {
    q: "How do I request a return or exchange for my order?",
    a: "Log in to your Soil & Soul account, go to 'My Orders', open your delivered order, and click 'Request Return / Exchange' under the items section. Enter the reason and upload or note any plant health details.",
  },
  {
    q: "What if a leaf or two drops during transit?",
    a: "Live plants can experience mild transit acclimatization shock. A few yellowing lower leaves are natural as the plant re-roots. However, if stems are broken or root rot is evident, our 7-day guarantee has you covered!",
  },
  {
    q: "Which items are eligible for return or exchange?",
    a: "All living plants (within 7 days of delivery), unused handcrafted tools, and unopened living soil/fertiliser bags (within 14 days of delivery).",
  },
  {
    q: "How long does the replacement process take?",
    a: "Once approved, replacement botanicals or tools are dispatched within 24–48 hours via express eco-courier.",
  },
];

export default function ReturnsPage() {
  return (
    <main className="bg-[#faf8f2] pb-16">
      <PageContainer className="pt-8 sm:pt-12">
        {/* Hero Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">
            Customer Care &amp; Guarantees
          </p>
          <h1 className={`${brandSerif.className} m-0 mt-3 text-3xl sm:text-5xl font-bold text-[#1f3d24]`}>
            Returns &amp; Botanical Exchanges
          </h1>
          <p className="m-0 mt-4 text-base sm:text-lg leading-relaxed text-[#4a5547]">
            We nurture our plants with deep care, and we want you to feel that same confidence when bringing them into your home.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-forest text-cream font-medium text-sm hover:bg-forest-dark transition-colors no-underline"
            >
              Go to My Orders to Request Return →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-line bg-white text-ink font-medium text-sm hover:border-forest/50 transition-colors no-underline"
            >
              Contact Plant Helpline
            </Link>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto mb-16">
          {GUARANTEE_POINTS.map((g) => (
            <div key={g.title} className="rounded-2xl border border-line bg-white p-6 shadow-xs flex flex-col">
              <span className="text-3xl mb-3" aria-hidden="true">
                {g.icon}
              </span>
              <h3 className={`${brandSerif.className} m-0 text-lg font-semibold text-heading`}>{g.title}</h3>
              <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
            </div>
          ))}
        </div>

        {/* Step by step process */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-line bg-cream p-6 sm:p-10 mb-16 shadow-xs">
          <h2 className={`${brandSerif.className} m-0 text-2xl sm:text-3xl font-bold text-center text-[#1f3d24] mb-8`}>
            How It Works in 3 Simple Steps
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center text-lg font-bold mb-3 shadow-sm">
                1
              </div>
              <h4 className="m-0 text-base font-semibold text-ink">Submit Request</h4>
              <p className="m-0 mt-1 text-xs text-muted leading-relaxed">
                Open your delivered order in <Link href="/account/orders" className="text-forest underline">My Orders</Link> and select Return or Exchange with a brief reason.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center text-lg font-bold mb-3 shadow-sm">
                2
              </div>
              <h4 className="m-0 text-base font-semibold text-ink">Nursery Review</h4>
              <p className="m-0 mt-1 text-xs text-muted leading-relaxed">
                Our horticultural team reviews your request within 24 hours and approves replacement or pickup.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center text-lg font-bold mb-3 shadow-sm">
                3
              </div>
              <h4 className="m-0 text-base font-semibold text-ink">Resolution</h4>
              <p className="m-0 mt-1 text-xs text-muted leading-relaxed">
                We dispatch a fresh healthy plant or process your COD refund directly. Zero hassle.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className={`${brandSerif.className} m-0 text-2xl sm:text-3xl font-bold text-center text-[#1f3d24] mb-6`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-line bg-white p-5">
                <h4 className="m-0 text-sm sm:text-base font-semibold text-ink">{faq.q}</h4>
                <p className="m-0 mt-2 text-xs sm:text-sm text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
