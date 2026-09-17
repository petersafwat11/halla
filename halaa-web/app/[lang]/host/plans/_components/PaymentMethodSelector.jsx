"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { useApplePayAvailability } from "@/hooks/payments";
import { formatExpiryInput, detectCardBrand as sharedDetectCardBrand } from "@halaa/shared/utils";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";
import { CARD_NETWORK_ORDER } from "@halaa/shared/brand/paymentMarks";
import PaymentBrandMark from "./PaymentBrandMark";
import styles from "./PaymentMethodSelector.module.css";

const METHODS = [
  {
    key: "creditcard",
    Logo: () => (
      <div className={styles.brandChips}>
        {CARD_NETWORK_ORDER.map((brand) => (
          <PaymentBrandMark key={brand} brand={brand} chip />
        ))}
      </div>
    ),
  },
  {
    key: "applepay",
    Logo: () => <PaymentBrandMark brand="applepay" />,
    // Only offered where an Apple Pay sheet can actually open — otherwise it
    // would be a dead tab on every non-Apple browser.
    requiresApplePay: true,
  },
  {
    key: "stcpay",
    // `stcpay` stays the wire value — it is the Moyasar source type and the
    // stored Payment.paymentMethod — but the brand shown to the customer is
    // "stc bank", which is what they see in their own app.
    Logo: () => <PaymentBrandMark brand="stcbank" />,
  },
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
  const applePayAvailable = useApplePayAvailability();
  const [card, setCard] = useState({ name: "", number: "", month: "", year: "", cvc: "" });
  const [expiryText, setExpiryText] = useState("");
  const [mobileText, setMobileText] = useState("");

  const methods = useMemo(
    () => METHODS.filter((method) => !method.requiresApplePay || applePayAvailable),
    [applePayAvailable]
  );

  // If Apple Pay disappears (or was never there) while selected, fall back to
  // cards so the host is never left on a method they cannot complete.
  useEffect(() => {
    if (value === "applepay" && !applePayAvailable) {
      onChange("creditcard");
    }
  }, [value, applePayAvailable, onChange]);

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

  const renderCardInputBrandIcon = () =>
    CARD_NETWORK_ORDER.includes(activeCardBrand) ? (
      <span className={styles.fieldBrandBox}>
        <PaymentBrandMark brand={activeCardBrand} />
      </span>
    ) : null;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.tabs}
        role="radiogroup"
        data-methods={methods.length}
      >
        {methods.map(({ key, Logo }) => {
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

      {value === "applepay" && (
        <div className={styles.fields}>
          <p className={styles.note}>
            <FaLock className={styles.noteIcon} aria-hidden="true" />
            <span>
              {t(
                "checkout.applepay.note",
                "Apple Pay opens when you confirm — approve the payment with Face ID, Touch ID or your passcode."
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
