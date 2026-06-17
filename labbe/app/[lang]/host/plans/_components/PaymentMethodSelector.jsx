"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import styles from "./PaymentMethodSelector.module.css";

// --- High-Quality SVG Icons ---
const VisaLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="34" height="22" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path fill="#151b54" d="M22.2,26.4l2.1-10.3h3.5L25.7,26.4H22.2z M37.7,16.5c-0.7-0.3-1.9-0.6-3.3-0.6c-3.6,0-6.1,1.8-6.2,4.4c-0.1,1.9,1.8,2.9,3.2,3.5c1.4,0.7,1.9,1.1,1.9,1.7c0,0.9-1.2,1.3-2.3,1.3c-1.5,0-2.4-0.2-3.6-0.8l-0.5-0.2l-0.5,3.3c1,0.4,2.8,0.8,4.7,0.8c3.8,0,6.3-1.8,6.4-4.6c0.1-1.5-1-2.7-3.1-3.6c-1.3-0.6-2.1-1.1-2.1-1.7c0-0.6,0.7-1.2,2.2-1.2c1.2,0,2.1,0.2,2.8,0.5l0.3,0.1L37.7,16.5z M45.8,16.1h-2.7c-0.8,0-1.5,0.2-1.8,1l-6.4,14.6h3.6l0.7-1.9h4.4l0.4,1.9h3.2L45.8,16.1z M40.6,26.8l1.9-5.1l1.1,5.1H40.6z M16.7,16.1L13.3,27l-0.4-1.8c-0.6-2.1-2.5-4.4-4.7-5.5L11.5,31.7h3.7l5.5-15.6H16.7z M8.1,16.1H0.2v0.8c4.9,1.2,8.2,4.2,9.6,7.6L8.4,18.8C8.1,16.9,8.1,16.1,8.1,16.1z" />
  </svg>
);

const MastercardLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="34" height="22" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="18" cy="24" r="14" fill="#eb001b" />
    <circle cx="30" cy="24" r="14" fill="#ff5f00" fillOpacity="0.8" />
  </svg>
);

const MadaLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="45" height="18" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path fill="#0075A0" d="M12.5,23.3C10.2,23.3,8,22,6.9,19.9c2.1-3.6,5.9-6,10.2-6c3.2,0,6.1,1.3,8.2,3.4l2.4-2.4C24.7,11.9,20.8,10,17.1,10C10.8,10,5.3,13.8,2.7,19.3c-0.2,0.4-0.2,0.8,0,1.2C5.3,26,10.8,29.8,17.1,29.8c3.7,0,7.6-1.9,10.6-4.9l-2.4-2.4C23.2,22,20.3,23.3,12.5,23.3z" />
    <path fill="#54B948" d="M33.6,10c-3.7,0-7.6,1.9-10.6,4.9l2.4,2.4c2.1-2.1,5-3.4,12.8-3.4c2.3,0,4.5,1.3,5.6,3.4c-2.1,3.6-5.9,6-10.2,6c-3.2,0-6.1-1.3-8.2-3.4l-2.4,2.4c3,3,6.9,4.9,10.6,4.9c6.3,0,11.8-3.8,14.4-9.3c0.2-0.4,0.2-0.8,0-1.2C45.4,13.8,39.9,10,33.6,10z" />
    <text x="52" y="25" fontFamily="Cairo, Arial, sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" fill="#0075A0">mada</text>
  </svg>
);

const StcPayLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="50" height="20" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect width="100" height="40" fill="#4f005d" rx="6" />
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontFamily="Cairo, Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#00E5FF">stc pay</text>
  </svg>
);

const ApplePayLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="50" height="20" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect width="100" height="40" fill="#000000" rx="6" />
    <path fill="#FFFFFF" d="M26.2,20.4c0-2.3,1.8-3.4,1.9-3.5c-1.1-1.6-2.8-1.8-3.4-1.8c-1.4-0.1-2.8,0.8-3.5,0.8c-0.7,0-1.9-0.8-3.1-0.7c-1.5,0-3,0.9-3.7,2.2c-1.6,2.7-0.4,6.7,1.1,8.9c0.7,1.1,1.6,2.2,2.8,2.2c1.1,0,1.5-0.7,2.9-0.7c1.3,0,1.8,0.7,2.9,0.7c1.2,0,2-1,2.7-2.1c0.9-1.3,1.2-2.5,1.2-2.6C28,23.5,26.2,22.2,26.2,20.4z" />
    <path fill="#FFFFFF" d="M22.9,13.7c0.6-0.8,1.1-1.8,0.9-2.9c-0.9,0-2.1,0.6-2.7,1.3c-0.6,0.7-1.1,1.8-0.9,2.8C21.2,15,22.3,14.4,22.9,13.7z" />
    <text x="44" y="26" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF">Pay</text>
  </svg>
);

const METHODS = [
  { key: "creditcard", labelKey: "checkout.method.card", Logo: () => <div style={{ display: 'flex', gap: '4px' }}><VisaLogo /><MastercardLogo /><MadaLogo /></div> },
  { key: "applepay",   labelKey: "checkout.method.applepay", Logo: ApplePayLogo },
  { key: "stcpay",     labelKey: "checkout.method.stcpay",   Logo: StcPayLogo },
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
        const yy = cardData.year.toString().slice(-2);
        setExpiryText(`${cardData.month}/${yy}`);
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
    const val = e.target.value;
    const clean = val.replace(/\D/g, "").slice(0, 4);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    setExpiryText(formatted);

    const month = clean.slice(0, 2);
    const yy = clean.slice(2, 4);
    const year = yy ? `20${yy}` : "";
    
    const next = { ...card, month, year };
    setCard(next);
    onCardChange?.(next);
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobileText(val);
    onMobileChange?.(val);
  };

  const activeCardBrand = detectCardBrand(card.number || "");

  const renderCardInputBrandIcon = () => {
    switch (activeCardBrand) {
      case "visa":
        return <VisaLogo />;
      case "mastercard":
        return <MastercardLogo />;
      case "mada":
        return <MadaLogo />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="radiogroup">
        {METHODS.map(({ key, labelKey, Logo }) => {
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
                <span className={styles.tabLabel}>{t(labelKey)}</span>
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
              placeholder="05XXXXXXXX"
              inputMode="tel"
              value={mobileText}
              onChange={handleMobileChange}
              autoComplete="tel"
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
