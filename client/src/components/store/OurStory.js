/**
 * OurStory — "Grow Good Things" brand story teaser.
 *
 * Server Component. Layout:
 *   md and up — photo on the left half, copy on a cream panel on the right
 *               (line-art leaves along the right edge from lg).
 *   below md  — photo on top, copy below.
 */

import Image from "next/image";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

const STORY_IMAGE = "/images/Nurturing a Sunlit Seedling.png";

/* ─── Botanical branch (right edge, lg+) ────────────────────────── */
function LeafBranch() {
  return (
    <BotanicalSprig
      className="hidden lg:block -right-[6%] -bottom-[8%] h-[112%] opacity-85"
      flip
      rotate={-6}
      sizes="320px"
    />
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function OurStory() {
  return (
    <section aria-labelledby="our-story-heading" className="bg-[#faf8f2] pb-8 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        <div
          className="grid md:grid-cols-[1fr_1.1fr] overflow-hidden rounded-2xl
                     border border-[#ebe6da] bg-[#f4f0e6]"
        >
          {/* Photo */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[250px] lg:min-h-[270px]">
            <Image
              src={STORY_IMAGE}
              alt="Hands gently pressing soil around a young seedling in a sunlit garden bed"
              fill
              sizes="(min-width: 1024px) 70vw, (min-width: 768px) 120vw, 190vw"
              className="object-cover object-[52%_center]"
            />
          </div>

          {/* Copy */}
          <div className="relative flex items-center px-6 py-7 sm:px-10 md:py-8 lg:px-12 xl:px-14 lg:pr-32 xl:pr-40">
            <LeafBranch />
            <div className="relative max-w-[30rem]">
              <p className="m-0 text-[0.6875rem] sm:text-xs font-medium tracking-[0.2em] uppercase text-[#6d7f60]">
                Our Story
              </p>
              <h2
                id="our-story-heading"
                className={`${brandSerif.className} m-0 mt-2 font-bold leading-tight text-[#1f3d24]
                            text-[1.5rem] sm:text-[1.7rem] xl:text-[1.9rem]`}
              >
                Grow Good Things
              </h2>
              <p className="m-0 mt-3 text-sm xl:text-[0.9375rem] leading-relaxed text-[#3f4a3a]">
                Soil &amp; Soul was born from a simple belief &mdash; that a greener planet starts
                with small choices. We bring you plants, gardening essentials and natural care
                products to help you live more consciously, beautifully and in harmony with nature.
              </p>
              <Link
                href="/our-story"
                className="group mt-5 inline-flex items-center gap-2 h-9 px-5 rounded-md
                           bg-[#24452a] text-[#f4f1e8] text-[0.8125rem] font-medium no-underline whitespace-nowrap
                           transition-colors duration-200 hover:bg-[#1b3520]
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
              >
                Our Story
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
