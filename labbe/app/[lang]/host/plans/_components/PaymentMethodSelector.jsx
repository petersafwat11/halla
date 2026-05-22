"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCreditCard, FaApplePay, FaMobileAlt, FaLock } from "react-icons/fa";
import styles from "./PaymentMethodSelector.module.css";

const METHODS = [
  { key: "creditcard", labelKey: "checkout.method.card",     Icon: FaCreditCard },
  { key: "applepay",   labelKey: "checkout.method.applepay", Icon: FaApplePay   },
  { key: "stcpay",     labelKey: "checkout.method.stcpay",   Icon: FaMobileAlt  },
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
      <div className={styles.tabs} role="radiogroup">
        {METHODS.map(({ key, labelKey, Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => onChange(key)}
            >
              <Icon className={styles.icon} aria-hidden="true" />
              <span className={styles.tabLabel}>{t(labelKey)}</span>
            </button>
          );
        })}
      </div>

      {value === "creditcard" && (
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>
              {t("checkout.card.name", "Cardholder name")}
            </span>
            <input
              className={styles.input}
              placeholder={t("checkout.card.name", "Cardholder name")}
              value={card.name}
              onChange={(e) => updateCard("name", e.target.value)}
              autoComplete="cc-name"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {t("checkout.card.number", "Card number")}
            </span>
            <div className={styles.inputWithIcon}>
              <FaCreditCard className={styles.inputIcon} aria-hidden="true" />
              <input
                className={`${styles.input} ${styles.inputWithIconField}`}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                maxLength={19}
                value={card.number}
                onChange={(e) =>
                  updateCard("number", e.target.value.replace(/\D/g, ""))
                }
                autoComplete="cc-number"
              />
            </div>
          </label>

          <div className={styles.row}>
            <div className={`${styles.field} ${styles.fieldExpiry}`}>
              <span className={styles.label}>
                {t("checkout.card.expiry", "Expiry date")}
              </span>
              <div className={styles.expiryBox}>
                <input
                  className={`${styles.expiryInput} ${styles.expiryMonth}`}
                  placeholder="MM"
                  maxLength={2}
                  inputMode="numeric"
                  value={card.month}
                  onChange={(e) => updateCard("month", e.target.value.replace(/\D/g, ""))}
                  autoComplete="cc-exp-month"
                  aria-label={t("checkout.card.month", "MM")}
                />
                <span className={styles.expirySeparator} aria-hidden="true">/</span>
                <input
                  className={`${styles.expiryInput} ${styles.expiryYear}`}
                  placeholder="YYYY"
                  maxLength={4}
                  inputMode="numeric"
                  value={card.year}
                  onChange={(e) => updateCard("year", e.target.value.replace(/\D/g, ""))}
                  autoComplete="cc-exp-year"
                  aria-label={t("checkout.card.year", "YYYY")}
                />
              </div>
            </div>
            <label className={`${styles.field} ${styles.fieldCvc}`}>
              <span className={styles.label}>
                {t("checkout.card.cvc", "CVC")}
              </span>
              <div className={styles.inputWithIcon}>
                <FaLock className={styles.inputIcon} aria-hidden="true" />
                <input
                  className={`${styles.input} ${styles.inputWithIconField}`}
                  placeholder="•••"
                  maxLength={4}
                  inputMode="numeric"
                  value={card.cvc}
                  onChange={(e) => updateCard("cvc", e.target.value.replace(/\D/g, ""))}
                  autoComplete="cc-csc"
                />
              </div>
            </label>
          </div>

          <p className={styles.note}>
            <FaLock className={styles.noteIcon} aria-hidden="true" />
            <span>
              {t(
                "checkout.card.secureNote",
                "Your card details are encrypted and processed securely."
              )}
            </span>
          </p>
        </div>
      )}

      {value === "stcpay" && (
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>
              {t("checkout.stcpay.mobile", "Mobile number")}
            </span>
            <input
              className={styles.input}
              placeholder="05XXXXXXXX"
              inputMode="tel"
              value={mobile}
              onChange={(e) => updateMobile(e.target.value.replace(/\D/g, ""))}
              autoComplete="tel"
            />
          </label>
          <p className={styles.note}>
            <FaLock className={styles.noteIcon} aria-hidden="true" />
            <span>
              {t(
                "checkout.stcpay.note",
                "You'll receive a confirmation prompt in your STC Pay app."
              )}
            </span>
          </p>
        </div>
      )}

      {value === "applepay" && (
        <p className={styles.note}>
          <FaApplePay className={styles.noteIcon} aria-hidden="true" />
          <span>
            {t(
              "checkout.applepay.note",
              "You'll be prompted by Apple Pay on the next step."
            )}
          </span>
        </p>
      )}
    </div>
  );
}
