"use client";
import { Header } from "@/ui/layout";

export default function MarketPlaceLayout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
