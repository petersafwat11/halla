"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Store } from "lucide-react";
import ar from "@/localization/locales/ar/marketplace.json";
import en from "@/localization/locales/en/marketplace.json";

export default function VendorNotFound() {
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
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f5f3ef", display: "grid", placeItems: "center", color: "#c28e5c" }}>
          <Store size={32} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#221d18" }}>
          {copy.errors?.profileNotFoundTitle || (isAr ? "مزود الخدمة غير موجود" : "Vendor not found")}
        </h1>
        <p style={{ color: "#666", margin: 0, lineHeight: 1.6 }}>
          {copy.errors?.profileLoadFailed || (isAr ? "ملف هذا المزود غير متاح حالياً في السوق." : "This vendor is no longer available in the marketplace.")}
        </p>
        <Link
          href={`/${isAr ? "ar" : "en"}/market-place`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            padding: "10px 20px",
            borderRadius: 10,
            background: "#c28e5c",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ArrowIcon size={18} />
          {copy.vendor?.backToMarketplace || (isAr ? "العودة إلى السوق" : "Back to marketplace")}
        </Link>
      </div>
    </main>
  );
}
