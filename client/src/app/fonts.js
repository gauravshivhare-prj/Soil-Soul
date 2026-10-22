/**
 * Shared font instances. next/font must be called at module scope, so
 * fonts used by more than one component live here.
 */

import { Caveat, Lora } from "next/font/google";

/* Brand serif — wordmark and display headings. */
export const brandSerif = Lora({
  subsets: ["latin"],
  display: "swap",
});

/* Handwritten accent — footer tagline. */
export const scriptFont = Caveat({
  subsets: ["latin"],
  display: "swap",
});
