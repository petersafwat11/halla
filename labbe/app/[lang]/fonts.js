import { Tajawal, Cairo, Great_Vibes } from "next/font/google";

export const tajawal = Tajawal({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "700", "800", "900"],
});

export const cairo = Cairo({
  subsets: ["latin"],
  display: "swap",
});

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
  display: "swap",
});
