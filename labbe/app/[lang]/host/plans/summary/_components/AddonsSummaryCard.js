"use client";
import React from "react";
import styles from "../summary.module.css";

const AddonsSummaryCard = ({ addonItems = [], t }) => {
  if (!addonItems.length) return null;

  const labelFor = (item) => {
    const type = item.addonType || item.type;
    if (type === "extra_invites") {
      return t("summary.addonItems.extra_invites", { quantity: item.quantity });
    }
    if (type === "extra_reminders") {
      return t("summary.addonItems.extra_reminders", { quantity: item.quantity });
    }
    if (type === "design_template") {
      return t("summary.addonItems.design_template");
    }
    return type;
  };

  return (
    <>
      {addonItems.map((item, idx) => (
        <div key={idx} className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{labelFor(item)}</span>
          <span className={styles.summaryValue}>
            {item.price} {t("common.currency.sar")}
          </span>
        </div>
      ))}
    </>
  );
};

export default AddonsSummaryCard;
