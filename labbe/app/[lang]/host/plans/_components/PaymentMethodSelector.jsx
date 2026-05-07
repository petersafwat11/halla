"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./PaymentMethodSelector.module.css";

const METHODS = [
  { key: "creditcard", labelKey: "checkout.method.card",     icon: "💳" },
  { key: "applepay",   labelKey: "checkout.method.applepay", icon: "🍎" },
  { key: "stcpay",     labelKey: "checkout.method.stcpay",   icon: "📱" },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  onCardChange,
  onMobileChange,
}) {
  const { t } = useTranslation("plans");
  const [card, setCard] = useState({ name: "", number: "", month: "", year: "", cvc: "" });
  const [mobile, setMobile] = useState("");

  const updateCard = (field, val) => {
    const next = { ...card, [field]: val };
    setCard(next);
    onCardChange?.(next);
  };
  const updateMobile = (val) => {
    setMobile(val);
    onMobileChange?.(val);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`${styles.tab} ${value === m.key ? styles.tabActive : ""}`}
            onClick={() => onChange(m.key)}
          >
            <span className={styles.icon}>{m.icon}</span>
            <span>{t(m.labelKey)}</span>
          </button>
        ))}
      </div>

      {value === "creditcard" && (
        <div className={styles.fields}>
          <input
            className={styles.input}
            placeholder={t("checkout.card.name", "Cardholder name")}
            value={card.name}
            onChange={(e) => updateCard("name", e.target.value)}
          />
          <input
            className={styles.input}
            placeholder={t("checkout.card.number", "Card number")}
            inputMode="numeric"
            maxLength={19}
            value={card.number}
            onChange={(e) => updateCard("number", e.target.value.replace(/\D/g, ""))}
          />
          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              value={card.month}
              onChange={(e) => updateCard("month", e.target.value.replace(/\D/g, ""))}
            />
            <input
              className={styles.input}
              placeholder="YYYY"
              maxLength={4}
              inputMode="numeric"
              value={card.year}
              onChange={(e) => updateCard("year", e.target.value.replace(/\D/g, ""))}
            />
            <input
              className={styles.input}
              placeholder="CVC"
              maxLength={4}
              inputMode="numeric"
              value={card.cvc}
              onChange={(e) => updateCard("cvc", e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
      )}

      {value === "stcpay" && (
        <div className={styles.fields}>
          <input
            className={styles.input}
            placeholder="05XXXXXXXX"
            inputMode="tel"
            value={mobile}
            onChange={(e) => updateMobile(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}

      {value === "applepay" && (
        <p className={styles.note}>
          {t(
            "checkout.applepay.note",
            "You'll be prompted by Apple Pay on the next step."
          )}
        </p>
      )}
    </div>
  );
}
