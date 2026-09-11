"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { formatExpiryInput, detectCardBrand as sharedDetectCardBrand } from "@halaa/shared/utils";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";
import styles from "./PaymentMethodSelector.module.css";

// --- Card brand logos (official SVGs served from /public/svg/payment) ---
const CARD_BRANDS = {
  visa: { src: "/svg/payment/visa.svg", alt: "Visa" },
  mastercard: { src: "/svg/payment/mastercard.svg", alt: "Mastercard" },
  mada: { src: "/svg/payment/mada.svg", alt: "mada" },
};

const CARD_BRAND_ORDER = ["visa", "mastercard", "mada"];

// A single brand logo normalized inside a uniform white "chip" so the three
// logos (which have very different native aspect ratios) read consistently.
const BrandChip = ({ brand }) => {
  const meta = CARD_BRANDS[brand];
  if (!meta) return null;
  return (
    <span className={styles.brandChip}>
      <img src={meta.src} alt={meta.alt} className={styles.brandImg} loading="lazy" />
    </span>
  );
};

const StcPayLogo = ({ height = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width={Math.round(height * (100 / 40))} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect width="100" height="40" fill="#4f005d" rx="6" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontFamily="Cairo, Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#00E5FF">stc pay</text>
  </svg>
);

const METHODS = [
  {
    key: "creditcard",
    Logo: () => (
      <div className={styles.brandChips}>
        {CARD_BRAND_ORDER.map((brand) => (
          <BrandChip key={brand} brand={brand} />
        ))}
      </div>
    ),
  },
  // Apple Pay must only return after a real wallet session/token integration is available.
  { key: "stcpay",     Logo: () => <StcPayLogo height={24} /> },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  onCardChange,
  onMobileChange,
  cardData,
  stcMobile,
  errors = {},
}) {
  const { t } = useTranslation("plans");
  const [card, setCard] = useState({ name: "", number: "", month: "", year: "", cvc: "" });
  const [expiryText, setExpiryText] = useState("");
  const [mobileText, setMobileText] = useState("");

  useEffect(() => {
    if (cardData) {
      setCard(cardData);
      if (cardData.month && cardData.year) {
        const mm = cardData.month.toString().padStart(2, "0");
        const yy = cardData.year.toString().slice(-2);
        // Display order is MM/YY (month first), matching standard card expiry format.
        setExpiryText(`${mm}/${yy}`);
      }
    }
  }, [cardData]);

  useEffect(() => {
    if (stcMobile !== undefined) {
      setMobileText(stcMobile);
    }
  }, [stcMobile]);

  const updateCardField = (field, val) => {
    const next = { ...card, [field]: val };
    setCard(next);
    onCardChange?.(next);
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 16);
    updateCardField("number", digitsOnly);
  };

  const handleExpiryChange = (e) => {
    const input = e.target.value;
    const { formatted, month, year } = formatExpiryInput(input, expiryText);
    setExpiryText(formatted);

    // Stored contract: month="MM", year="20YY"
    const next = {
      ...card,
      month,
      year,
    };
    setCard(next);
    onCardChange?.(next);
  };

  const handleMobileChange = (e) => {
    const val = clampPhoneInput(e.target.value);
    setMobileText(val);
    onMobileChange?.(val);
  };

  const activeCardBrand = sharedDetectCardBrand(card.number || "");

  const renderCardInputBrandIcon = () => {
    const meta = CARD_BRANDS[activeCardBrand];
    if (!meta) return null;
    return (
      <span className={styles.fieldBrandBox}>
        <img src={meta.src} alt={meta.alt} className={styles.brandImg} />
      </span>
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="radiogroup">
        {METHODS.map(({ key, Logo }) => {
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
              <div className={styles.tabContent}>
                <div className={styles.tabLogoWrap}>
                  <Logo />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {value === "creditcard" && (
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>
              {t("checkout.card.name", "Cardholder name")}
            </label>
            <input
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              placeholder={t("checkout.card.name", "Cardholder name")}
              value={card.name || ""}
              onChange={(e) => updateCardField("name", e.target.value)}
              autoComplete="cc-name"
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t("checkout.card.number", "Card number")}
            </label>
            <div className={styles.inputWithIcon}>
              <div className={styles.brandIconWrapper}>
                {renderCardInputBrandIcon()}
              </div>
              <input
                className={`${styles.input} ${styles.inputWithIconField} ${errors.number ? styles.inputError : ""}`}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                maxLength={19}
                value={card.number ? card.number.replace(/(\d{4})(?=\d)/g, "$1 ") : ""}
                onChange={handleCardNumberChange}
                autoComplete="cc-number"
                dir="ltr"
                style={{ textAlign: "left" }}
              />
            </div>
            {errors.number && <span className={styles.errorText}>{errors.number}</span>}
          </div>

          <div className={styles.row}>
            <div className={`${styles.field} ${styles.fieldExpiry}`}>
              <label className={styles.label}>
                {t("checkout.card.expiry", "Expiry date")}
              </label>
              <input
                className={`${styles.input} ${errors.expiry ? styles.inputError : ""}`}
                placeholder="MM/YY"
                maxLength={5}
                inputMode="numeric"
                value={expiryText}
                onChange={handleExpiryChange}
                autoComplete="cc-exp"
                dir="ltr"
                style={{ textAlign: "left" }}
              />
              {errors.expiry && <span className={styles.errorText}>{errors.expiry}</span>}
            </div>


            <div className={`${styles.field} ${styles.fieldCvc}`}>
              <label className={styles.label}>
                {t("checkout.card.cvc", "CVC")}
              </label>
              <input
                className={`${styles.input} ${errors.cvc ? styles.inputError : ""}`}
                placeholder="•••"
                maxLength={4}
                inputMode="numeric"
                value={card.cvc || ""}
                onChange={(e) => updateCardField("cvc", e.target.value.replace(/\D/g, ""))}
                autoComplete="cc-csc"
                dir="ltr"
                style={{ textAlign: "left" }}
              />
              {errors.cvc && <span className={styles.errorText}>{errors.cvc}</span>}
            </div>
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
          <div className={styles.field}>
            <label className={styles.label}>
              {t("checkout.stcpay.mobile", "Mobile number")}
            </label>
            <input
              className={`${styles.input} ${errors.stcMobile ? styles.inputError : ""}`}
              placeholder={DEFAULT_PHONE_PLACEHOLDER}
              maxLength={getPhoneMaxLength(mobileText)}
              inputMode="tel"
              value={mobileText}
              onChange={handleMobileChange}
              autoComplete="tel"
              dir="ltr"
              style={{ textAlign: "left" }}
            />
            {errors.stcMobile && <span className={styles.errorText}>{errors.stcMobile}</span>}
          </div>
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

    </div>
  );
}
