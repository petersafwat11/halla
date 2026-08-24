"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaLock, FaApple } from "react-icons/fa";
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

const ApplePayLogo = () => (
  <FaApple size={28} color="var(--color-secondary-900)" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
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
  { key: "applepay",   Logo: ApplePayLogo },
  { key: "stcpay",     Logo: () => <StcPayLogo height={24} /> },
];

const detectCardBrand = (number) => {
  const clean = number.replace(/\D/g, "");
  if (!clean) return "unknown";

  // Mada ranges
  const p6 = clean.substring(0, 6);
  const p4 = clean.substring(0, 4);
  const mada6 = [
    "406136", "410621", "417633", "422817", "422818", "422819", "428331", "428671", "428672", "428673", "431361", "432328", "434673", "439953", "440533", "440647", "445564", "446393", "446404", "446672", "455036", "455708", "457865", "457997", "458456", "462220", "468541", "468542", "468543", "483010", "483011", "483012", "484783", "486094", "486095", "486096", "489317", "489318", "489319", "493137", "504300", "506959", "506960", "506961", "506962", "506963", "513213", "520058", "521076", "524130", "524514", "529415", "529741", "530060", "530906", "531095", "531196", "532013", "535822", "535989", "536023", "537767", "539931", "543085", "543357", "549760", "554180", "557606", "558848", "585265", "588845", "588846", "588847", "588848", "588849", "588850", "588851", "588982", "588983", "589005", "589206", "604906", "605141", "636120", "968201", "968202", "968203", "968204", "968205", "968206", "968207", "968208", "968209", "968211"
  ];
  
  if (mada6.includes(p6)) return "mada";
  
  const p4Num = parseInt(p4, 10);
  if (p4Num === 5892 || p4Num === 9682) return "mada";

  if (clean.startsWith("4")) return "visa";
  
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) {
    return "mastercard";
  }
  
  return "unknown";
};

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

  const activeCardBrand = (sharedDetectCardBrand || detectCardBrand)(card.number || "");

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

      {value === "applepay" && (
        <div className={styles.fields}>
          <p className={styles.note}>
            <span style={{ fontSize: '1.6rem', marginRight: '4px' }}></span>
            <span>
              {t(
                "checkout.applepay.note",
                "You'll be prompted by Apple Pay on the next step."
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
