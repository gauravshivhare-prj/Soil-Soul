/**
 * AuthLayout — split-screen shell for /login and /register.
 *
 * Left: botanical welcome panel (no lifestyle photo yet — warm gradient
 * with the contained sprig). Right: Login / Register tabs and the form.
 */

import Link from "next/link";
import { brandSerif, scriptFont } from "@/app/fonts";
import BotanicalSprig from "@/components/ui/BotanicalSprig";
import Icon from "@/components/ui/Icon";
import { PageContainer } from "@/components/ui/PageHeader";

const PERKS = [
  { icon: "leaf", title: "Exclusive offers", text: "Get special deals and early access" },
  { icon: "sprout", title: "Track your orders", text: "Stay updated, always" },
  { icon: "heart", title: "Save your favourites", text: "Create wishlists for later" },
];

function Tab({ href, isActive, children }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${brandSerif.className} relative flex-1 pb-3 text-center text-lg font-bold no-underline
                  ${isActive ? "text-heading after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-forest" : "text-faint hover:text-muted"}`}
    >
      {children}
    </Link>
  );
}

export default function AuthLayout({ active, children }) {
  return (
    <main className="py-6 sm:py-10">
      <PageContainer className="max-w-[1240px]">
        <div className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-[0_10px_40px_rgba(36,69,42,0.08)] lg:grid-cols-[1.05fr_1fr]">
          {/* Welcome panel */}
          <section className="relative overflow-hidden bg-gradient-to-br from-sand via-[#f1ece0] to-sage-100 px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <BotanicalSprig className="hidden sm:block -right-8 -bottom-12 h-[62%] opacity-75" flip rotate={-8} eager />
            <div className="relative max-w-md">
              <p className="m-0 text-xs font-medium tracking-[0.2em] uppercase text-[#6d7f60]">Welcome to Soil &amp; Soul</p>
              <h1 className={`${brandSerif.className} m-0 mt-3 text-[2rem] sm:text-[2.6rem] lg:text-[3rem] leading-[1.08] font-bold text-heading`}>
                Good Plants
                <br />
                Brighter Days
              </h1>
              <p className="m-0 mt-4 text-sm sm:text-base leading-relaxed text-body">
                Join our community of plant lovers and bring nature closer to your home.
              </p>
              <ul className="list-none m-0 mt-7 p-0 hidden sm:grid gap-4">
                {PERKS.map((p) => (
                  <li key={p.title} className="flex items-center gap-3.5">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/70 text-forest flex-shrink-0">
                      <Icon name={p.icon} size={22} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{p.title}</span>
                      <span className="block text-xs text-muted">{p.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={`${scriptFont.className} hidden lg:block m-0 mt-12 -rotate-6 text-[1.9rem] leading-[1.05] text-heading/80`} aria-hidden="true">
                Good Choices,
                <br />
                &nbsp;&nbsp;Greener Tomorrows
              </p>
            </div>
          </section>

          {/* Form panel */}
          <section className="px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
            <div className="mx-auto max-w-md">
              <nav aria-label="Account access" className="flex border-b border-line mb-7">
                <Tab href="/login" isActive={active === "login"}>Login</Tab>
                <Tab href="/register" isActive={active === "register"}>Register</Tab>
              </nav>
              {children}
            </div>
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
