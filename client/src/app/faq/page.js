"use client";

import { useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { PageContainer } from "@/components/ui/PageHeader";

const FAQ_SECTIONS = [
  {
    category: "🌿 Live Plants & Plant Care",
    questions: [
      {
        q: "What should I do immediately when my plant arrives?",
        a: "Unbox your plant gently in a shaded area. Check the soil moisture with your finger: if it feels dry 1–2 inches down, give it a gentle drink of water. Place it in bright, indirect light and let it rest for 3–5 days to acclimatize before moving it to full sun or repotting.",
      },
      {
        q: "Why are some lower leaves turning yellow?",
        a: "A few lower leaves turning yellow after transit is completely natural—it is the plant's way of conserving energy while re-establishing its root balance. However, if multiple upper leaves turn yellow and soil stays soggy, it may be overwatered. Let the top 2 inches dry out.",
      },
      {
        q: "Which houseplants are safe for cats and dogs?",
        a: "Our collection features certified non-toxic companions including Calatheas, Boston Ferns, Areca Palms, Peperomias, and Spider Plants. Look for the 'Pet Friendly' badge in our shop filters!",
      },
    ],
  },
  {
    category: "📦 Eco Shipping & Plastic-Free Packaging",
    questions: [
      {
        q: "How are live plants shipped without plastic?",
        a: "We wrap our root balls in breathable organic coco-coir mesh with moist moss, secure the nursery pot in recycled honeycomb cardboard, and package inside double-walled corrugated boxes with biodegradable paper tape. Zero single-use plastic.",
      },
      {
        q: "What is your Safe Transit Guarantee?",
        a: "We guarantee 100% healthy arrival for every plant. If a plant is crushed or damaged during transit, simply notify us within 7 days from delivery and we will send a replacement free of charge.",
      },
      {
        q: "How long does delivery take?",
        a: "Most metro deliveries take 2–4 business days. Regional orders take 3–5 business days. We ship via express botanical courier to minimize transit time in dark parcels.",
      },
    ],
  },
  {
    category: "💳 Orders, Payments & Cancellation",
    questions: [
      {
        q: "What payment methods are supported?",
        a: "We proudly offer Cash on Delivery (COD) across India so you can inspect your botanical package at your doorstep before paying.",
      },
      {
        q: "Can I cancel my order?",
        a: "Yes! You can cancel your order directly from your account page anytime before the order status transitions to 'Processing' or 'Shipped'. Once dispatched from our nursery, cancellation is closed.",
      },
      {
        q: "How do I apply a discount coupon?",
        a: "During checkout on the 'Review Order' step, enter your coupon code (e.g. SOUL10) in the coupon box and click 'Apply'. The discount will be reflected immediately in your order total.",
      },
    ],
  },
  {
    category: "🌱 Living Soil & Organic Care",
    questions: [
      {
        q: "What makes 'Living Soil' different from ordinary potting soil?",
        a: "Ordinary soil is often inert or chemically treated. Soil & Soul living soil is inoculated with beneficial mycorrhizal fungi, bio-char, and beneficial micro-organisms that form a symbiotic network with plant roots, releasing nutrients naturally.",
      },
      {
        q: "Is your Vermicompost 100% organic?",
        a: "Yes, our vermicompost is aged for 90 days with African nightcrawler earthworms and certified free of synthetic weedicides, chemical additives, or animal waste pathogens.",
      },
    ],
  },
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndices, setOpenIndices] = useState({ "0-0": true, "1-0": true });

  const toggle = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    setOpenIndices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="bg-[#faf8f2] pb-16">
      <PageContainer className="pt-8 sm:pt-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">
            Help Center &amp; Knowledge Base
          </p>
          <h1 className={`${brandSerif.className} m-0 mt-3 text-3xl sm:text-5xl font-bold text-[#1f3d24]`}>
            Frequently Asked Questions
          </h1>
          <p className="m-0 mt-3 text-base sm:text-lg leading-relaxed text-[#4a5547]">
            Find answers to common questions about botanical care, our plastic-free packaging, COD delivery, and plant health guarantees.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-4xl mx-auto">
          {FAQ_SECTIONS.map((sec, idx) => (
            <button
              key={sec.category}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border ${
                activeCategory === idx
                  ? "bg-forest text-cream border-forest shadow-xs"
                  : "bg-white text-ink border-line hover:border-forest/40"
              }`}
            >
              {sec.category}
            </button>
          ))}
        </div>

        {/* Accordions */}
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ_SECTIONS[activeCategory].questions.map((faq, qIdx) => {
            const isOpen = Boolean(openIndices[`${activeCategory}-${qIdx}`]);
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-line bg-white overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(activeCategory, qIdx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 bg-transparent border-0 cursor-pointer text-ink font-semibold text-sm sm:text-base hover:text-forest transition-colors"
                >
                  <span>{faq.q}</span>
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-full bg-sand/60 text-forest text-lg shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-muted leading-relaxed border-t border-line/40 animate-in fade-in duration-150">
                    <p className="m-0 mt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Contact Help Card */}
        <div className="max-w-2xl mx-auto mt-14 rounded-3xl border border-line bg-cream p-8 text-center space-y-3">
          <span className="text-3xl">🌿</span>
          <h3 className={`${brandSerif.className} m-0 text-xl font-bold text-[#1f3d24]`}>
            Still have a question?
          </h3>
          <p className="m-0 text-xs sm:text-sm text-muted">
            Our botanists and support specialists are always happy to chat.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-forest text-cream text-xs font-medium hover:bg-forest-dark transition-colors no-underline"
            >
              Contact Support
            </Link>
            <Link
              href="/returns"
              className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-line bg-white text-ink text-xs font-medium hover:border-forest/50 transition-colors no-underline"
            >
              Returns Policy
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
