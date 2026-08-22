"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import ar from "@/localization/locales/ar/marketplace.json";
import en from "@/localization/locales/en/marketplace.json";

export default function VendorProfileError({ reset }) {
  const { lang } = useParams() || {};
  const isAr = lang !== "en";
  const copy = isAr ? ar : en;
  const ArrowIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
      }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fee4e2", display: "grid", placeItems: "center", color: "#d92d20" }}>
          <AlertCircle size={32} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#221d18" }}>
          {copy.errors?.loadFailedTitle || (isAr ? "تعذر تحميل صفحة المزود" : "Unable to load this vendor")}
        </h1>
        <p style={{ color: "#666", margin: 0, lineHeight: 1.6 }}>
          {copy.errors?.loadFailed || (isAr ? "يرجى التحقق من اتصالك والمحاولة مرة أخرى." : "Please check your connection and try again.")}
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: 0,
              borderRadius: 10,
              padding: "10px 20px",
              background: "#c28e5c",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              font: "inherit",
            }}
          >
            <RotateCcw size={16} />
            {copy.errors?.retry || (isAr ? "حاول مرة أخرى" : "Try again")}
          </button>
          <Link
            href={`/${isAr ? "ar" : "en"}/market-place`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#333",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ArrowIcon size={18} />
            {copy.vendor?.backToMarketplace || (isAr ? "العودة إلى السوق" : "Back to marketplace")}
          </Link>
        </div>
      </div>
    </main>
  );
}
