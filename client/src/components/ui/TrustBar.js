"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Icons ──────────────────────────────────────────────────────── */

function LeafCheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#24452a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Leaf shape */}
      <path d="M26 4C26 4 14 3 8.5 10.5C4 16.5 5.5 24 5.5 24C5.5 24 13 26.5 19 21.5C26 15.5 26 4 26 4Z" />
      {/* Midrib */}
      <path d="M5.5 24C9 18 13.5 13 20 8" />
      {/* Checkmark */}
      <path d="M10 17L14 21L22 11" stroke="#3d7a44" strokeWidth="2" />
    </svg>
  );
}

function PlantPotIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#24452a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Pot */}
      <path d="M10 18H22L20 28H12L10 18Z" />
      <line x1="9" y1="18" x2="23" y2="18" strokeWidth="1.8" />
      {/* Stem */}
      <path d="M16 18V12" />
      {/* Left leaf */}
      <path d="M16 14C14 12 10 11 8 12C8 12 9 16 13 17C14.5 17.3 16 16.5 16 14Z" fill="none" />
      {/* Right leaf */}
      <path d="M16 11C18 9 22 8.5 24 9.5C24 9.5 23 13 19 14C17.5 14.3 16 13 16 11Z" fill="none" />
    </svg>
  );
}

function NaturalLeafIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#24452a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Large leaf */}
      <path d="M6 26C6 26 4 14 12 8C18 4 26 5 26 5C26 5 28 17 20 23C14 27 6 26 6 26Z" />
      {/* Midrib */}
      <path d="M6 26C12 20 18 14 26 5" />
      {/* Side veins */}
      <path d="M12 21C14 18 14 15 13 12" />
      <path d="M18 16C20 14 20 11 19 8" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="#24452a"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Box body */}
      <path d="M5 12L16 6L27 12V24L16 30L5 24V12Z" />
      {/* Middle line */}
      <line x1="5" y1="12" x2="16" y2="18" />
      <line x1="27" y1="12" x2="16" y2="18" />
      <line x1="16" y1="18" x2="16" y2="30" />
      {/* Ribbon */}
      <path d="M10.5 9L16 12L21.5 9" />
    </svg>
  );
}

/* ─── Trust items data ───────────────────────────────────────────── */
const TRUST_ITEMS = [
  {
    icon: LeafCheckIcon,
    title: "Thoughtfully Chosen",
    subtitle: "Only the best for your home & garden",
  },
  {
    icon: PlantPotIcon,
    title: "Plant Care Essentials",
    subtitle: "Everything your plants need",
  },
  {
    icon: NaturalLeafIcon,
    title: "Natural Ingredients",
    subtitle: "Pure, plant-based goodness",
  },
  {
    icon: PackageIcon,
    title: "Carefully Packed",
    subtitle: "Safe & eco-friendly packaging",
  },
];

/* ─── Component ──────────────────────────────────────────────────── */
export default function TrustBar() {
  const barRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (barRef.current) {
      observer.observe(barRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={barRef}
      className="trust-bar"
      aria-label="Why shop with Soil & Soul"
    >
      <div className="trust-bar-inner">
        {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }, i) => (
          <div
            key={title}
            className={`trust-item ${isVisible ? "trust-item--visible" : ""}`}
            style={{ transitionDelay: `${i * 100 + 100}ms` }}
          >
            <div className="trust-item-icon">
              <Icon />
            </div>
            <div className="trust-item-text">
              <span className="trust-item-title">{title}</span>
              <span className="trust-item-subtitle">{subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
