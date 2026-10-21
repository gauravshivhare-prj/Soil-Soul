"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useEffect, useRef, useState } from "react";

const headingSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

/* ─── Decorative leaf SVGs ───────────────────────────────────────── */

function TopLeftLeaf() {
  return (
    <svg
      className="hero-leaf hero-leaf--top-left"
      width="180"
      height="220"
      viewBox="0 0 180 220"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M-20 0C10 60 40 120 80 160C100 180 140 200 170 210"
        stroke="#3d7a44"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M0 -10C20 40 50 90 90 130C110 150 130 170 160 185"
        stroke="#3d7a44"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.15"
      />
      <ellipse
        cx="30"
        cy="40"
        rx="60"
        ry="80"
        fill="#3d7a44"
        opacity="0.06"
        transform="rotate(-25 30 40)"
      />
    </svg>
  );
}

function BottomRightLeaf() {
  return (
    <svg
      className="hero-leaf hero-leaf--bottom-right"
      width="160"
      height="200"
      viewBox="0 0 160 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M170 210C140 160 110 110 70 70C50 50 20 20 -10 5"
        stroke="#3d7a44"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.2"
      />
      <ellipse
        cx="120"
        cy="150"
        rx="55"
        ry="70"
        fill="#3d7a44"
        opacity="0.05"
        transform="rotate(20 120 150)"
      />
    </svg>
  );
}

/* ─── Arrow icon for CTA ─────────────────────────────────────────── */
function ArrowRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function HeroSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-section"
      aria-label="Welcome to Soil & Soul"
    >
      {/* Background image */}
      <div className="hero-image-wrapper">
        <Image
          src="/images/hero/soil-soul-hero.png"
          alt="Soil & Soul products — live plants, organic potting soil, aloe vera gel, and neem face wash arranged on a wooden surface"
          fill
          priority
          sizes="100vw"
          quality={90}
          className="hero-image"
        />
        {/* Gradient overlay for text readability */}
        <div className="hero-overlay" />
      </div>

      {/* Decorative leaves */}
      <TopLeftLeaf />
      <BottomRightLeaf />

      {/* Content */}
      <div className="hero-content">
        <div
          className={`hero-text-block ${isVisible ? "hero-text-block--visible" : ""}`}
        >
          {/* Tagline */}
          <p className="hero-tagline">
            <span className="hero-tagline-dot" />
            Plants
            <span className="hero-tagline-sep">·</span>
            Gardening
            <span className="hero-tagline-sep">·</span>
            Natural Care
          </p>

          {/* Heading */}
          <h1 className={`hero-heading ${headingSerif.className}`}>
            Bring Nature
            <br />
            Closer to You
          </h1>

          {/* Description */}
          <p className="hero-description">
            Live plants, gardening essentials and
            <br className="hidden sm:block" />
            plant-based natural products for a healthier
            <br className="hidden sm:block" />
            home and a greener tomorrow.
          </p>

          {/* CTA buttons */}
          <div className="hero-cta-group">
            <Link href="/shop" className="hero-cta hero-cta--primary" id="hero-shop-all">
              Shop All
              <ArrowRight />
            </Link>
            <Link href="/plants" className="hero-cta hero-cta--secondary" id="hero-explore-plants">
              Explore Plants
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
