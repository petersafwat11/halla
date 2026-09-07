"use client";
import React from "react";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import styles from "../summary.module.css";

const AddonsSummaryCard = ({ addonItems = [], currency = "SAR", locale = "ar", t }) => {
  if (!addonItems.length) return null;

  const labelFor = (item) => {
    const type = item.addonType || item.type;
    if (type === "extra_invites") {
      return t("summary.addonItems.extra_invites", { quantity: item.quantity });
    }
    if (type === "design_template") {
      return t("summary.addonItems.design_template");
    }
    return item.label || type;
  };

  return (
    <>
      {addonItems.map((item, idx) => {
        const amount = item.subtotal != null ? item.subtotal : item.price;
        return (
          <div key={idx} className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{labelFor(item)}</span>
            <span className={styles.summaryValue}>
              <MoneyAmount amount={amount} currency={currency} locale={locale} />
            </span>
          </div>
        );
      })}
    </>
  );
};

export default AddonsSummaryCard;
