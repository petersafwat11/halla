import { Tajawal, Cairo, Great_Vibes, Amiri } from "next/font/google";

export const tajawal = Tajawal({
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "700", "800", "900"],
});

export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const amiri = Amiri({
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
  display: "swap",
});
