"use client";
import React from "react";
import { formatSar } from "@halaa/shared/utils";
import styles from "../summary.module.css";

const AddonsSummaryCard = ({ addonItems = [], currency = "SAR", t }) => {
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

  const currencyLabel = currency === "SAR" ? t("common.currency.sar") : currency;

  return (
    <>
      {addonItems.map((item, idx) => {
        const amount = item.subtotal != null ? item.subtotal : item.price;
        return (
          <div key={idx} className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{labelFor(item)}</span>
            <span className={styles.summaryValue}>
              {formatSar(amount)} {currencyLabel}
            </span>
          </div>
        );
      })}
    </>
  );
};

export default AddonsSummaryCard;
