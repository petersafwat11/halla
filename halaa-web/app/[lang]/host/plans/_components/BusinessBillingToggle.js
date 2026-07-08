"use client";
import React from "react";

/**
 * Billing-family toggle for business plans (event / quarterly / annual).
 * Mirrors BillingTypeToggle's inline styling so the business plans page stays
 * visually consistent with the host one.
 */
export default function BusinessBillingToggle({ billingType, onChange, t }) {
  const types = [
    { key: "event", label: t("business.billing.event") },
    { key: "quarterly", label: t("business.billing.quarterly") },
    { key: "annual", label: t("business.billing.annual") },
  ];

  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
      {types.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: "8px 20px",
            borderRadius: "20px",
            border: `2px solid ${billingType === key ? "#C28E5C" : "#E5E7EA"}`,
            background: billingType === key ? "#C28E5C" : "#FFF",
            color: billingType === key ? "#FFF" : "#333",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
