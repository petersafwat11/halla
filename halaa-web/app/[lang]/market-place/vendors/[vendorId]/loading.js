"use client";

import React from "react";
import { useParams } from "next/navigation";
import ar from "@/localization/locales/ar/marketplace.json";
import en from "@/localization/locales/en/marketplace.json";

export default function LoadingVendor() {
  const { lang } = useParams() || {};
  const isAr = lang !== "en";
  const copy = isAr ? ar : en;

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        color: "#888",
        fontFamily: "inherit",
      }}
      dir={isAr ? "rtl" : "ltr"}
      aria-busy="true"
      aria-label={copy.loading || (isAr ? "جاري التحميل..." : "Loading...")}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid #f0e6dc",
            borderTopColor: "#c28e5c",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>{copy.loading || (isAr ? "جاري التحميل..." : "Loading...")}</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
