/**
 * Shared font instances. next/font must be called at module scope, so
 * fonts used by more than one component live here.
 */

import { Lora } from "next/font/google";

/* Brand serif — wordmark and display headings. */
export const brandSerif = Lora({
  subsets: ["latin"],
  display: "swap",
});
