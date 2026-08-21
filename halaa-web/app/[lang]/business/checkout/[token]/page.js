"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { getLocalized } from "@halaa/shared/utils/locale";
import { validateCardExpiry, checkLuhn, buildCreditCardSource } from "@halaa/shared/utils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PaymentMethodSelector from "@/app/[lang]/host/plans/_components/PaymentMethodSelector";
import {
  useBusinessCheckoutSummary,
  useBusinessCheckoutSubmit,
} from "@/hooks/business";
import { toastUtils } from "@/utils/toastUtils";
import LegalSurfaceLinks from "@/ui/common/LegalSurfaceLinks";
import styles from "./checkout.module.css";

const PENDING_STATUS = "pending_payment";

const BusinessCheckoutPage = () => {
  const { t, i18n } = useTranslation("plans");
  const { token, lang } = useParams();

  const {
    data: summaryResponse,
    isLoading,
    error,
  } = useBusinessCheckoutSummary(token);
  const submitMutation = useBusinessCheckoutSubmit(token);

  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const summary = useMemo(
    () => summaryResponse?.data ?? summaryResponse ?? null,
    [summaryResponse]
  );

  const isValidLink = summary && summary.status === PENDING_STATUS;

  const buildSource = () => {
    if (paymentMethod === "creditcard") {
      return buildCreditCardSource(cardData || {});
    }
    if (paymentMethod === "stcpay") {
      return { type: "stcpay", mobile: stcMobile };
    }
    if (paymentMethod === "applepay") {
      return { type: "applepay", token: null };
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    if (paymentMethod === "creditcard") {
      const name = (cardData?.name || "").trim();
      const number = (cardData?.number || "").replace(/\D/g, "");
      const month = (cardData?.month || "").trim();
      const year = (cardData?.year || "").trim();
      const cvc = (cardData?.cvc || "").trim();

      if (!name) newErrors.name = t("checkout.errors.nameRequired");
      else if (name.length < 3) newErrors.name = t("checkout.errors.nameTooShort");

      if (!number) newErrors.number = t("checkout.errors.numberRequired");
      else if (number.length < 15 || number.length > 16)
        newErrors.number = t("checkout.errors.numberLength");
      else if (!checkLuhn(number))
        newErrors.number = t("checkout.errors.numberInvalid");

      const expiryCheck = validateCardExpiry(month, year);
      if (!expiryCheck.valid) {
        newErrors.expiry = t(expiryCheck.errorKey, "Invalid expiry date");
      }

      if (!cvc) newErrors.cvc = t("checkout.errors.cvcRequired");
      else if (cvc.length < 3 || cvc.length > 4)
        newErrors.cvc = t("checkout.errors.cvcLength");
    } else if (paymentMethod === "stcpay") {
      const mobile = (stcMobile || "").replace(/\D/g, "");
      if (!mobile) newErrors.stcMobile = t("checkout.errors.mobileRequired");
      else if (!/^(05|5)\d{8}$/.test(mobile))
        newErrors.stcMobile = t("checkout.errors.mobileFormat");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = async () => {
    if (isProcessing || submitMutation.isPending) return;
    if (!validateForm()) return;
    setIsProcessing(true);

    try {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/${lang}/business/checkout/${token}/return`
          : undefined;
      const result = await submitMutation.mutateAsync({
        source: buildSource(),
        callbackUrl,
      });
      if (result?.requiresAction) {
        // Submit hook already redirected to the bank 3DS page.
        return;
      }
      toastUtils.success(t("business.checkout.success"));
      if (typeof window !== "undefined") {
        window.location.href = `/${lang}/business/checkout/${token}/return`;
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "";
      toastUtils.error(message || t("business.checkout.failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  // Invalid / expired / used link — the summary endpoint throws for any
  // non-pending link, so treat both the query error and a non-pending status
  // as an unavailable link.
  if (error || !isValidLink) {
    const message =
      error?.response?.data?.message ||
      t("business.checkout.linkUnavailable");
    return (
      <div className={styles.page}>
        <div className={styles.stateCard}>
          <div className={styles.stateIcon}>⚠️</div>
          <h2 className={styles.stateTitle}>
            {t("business.checkout.linkUnavailableTitle")}
          </h2>
          <p className={styles.stateText}>{message}</p>
        </div>
      </div>
    );
  }

  const planName = getLocalized(summary.plan, "name", i18n.language) ||
    summary.plan?.nameEn ||
    summary.plan?.nameAr;
  const currency = summary.currency || t("currency");
  const lineItems = Array.isArray(summary.lineItems) ? summary.lineItems : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("business.checkout.title")}</h1>
          <p className={styles.subtitle}>{t("business.checkout.subtitle")}</p>
        </div>

        <div className={styles.layout}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  {t("business.checkout.planLabel")}
                </h2>
              </div>
              <div className={styles.planName}>{planName}</div>

              <div className={styles.lineItems}>
                {lineItems.map((item, idx) => (
                  <div key={idx} className={styles.lineRow}>
                    <span className={styles.lineLabel}>
                      {item.label}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                    </span>
                    <span className={styles.lineValue}>
                      {Number(item.total).toLocaleString()} {currency}
                    </span>
                  </div>
                ))}

                {summary.setupFee > 0 && (
                  <div className={styles.lineRow}>
                    <span className={styles.lineLabel}>
                      {t("business.checkout.setupFee")}
                    </span>
                    <span className={styles.lineValue}>
                      {Number(summary.setupFee).toLocaleString()} {currency}
                    </span>
                  </div>
                )}

                <div className={styles.divider} />

                <div className={`${styles.lineRow} ${styles.totalRow}`}>
                  <span>{t("business.checkout.total")}</span>
                  <span>
                    {Number(summary.total).toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  {t("summary.payment.method")}
                </h2>
              </div>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                onCardChange={setCardData}
                onMobileChange={setStcMobile}
                cardData={cardData}
                stcMobile={stcMobile}
                errors={errors}
              />
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.payCard}>
              <div className={styles.payTotalRow}>
                <span>{t("business.checkout.total")}</span>
                <span className={styles.payTotalValue}>
                  {Number(summary.total).toLocaleString()} {currency}
                </span>
              </div>
              <button
                type="button"
                className={styles.payButton}
                onClick={handlePay}
                disabled={isProcessing || submitMutation.isPending}
              >
                {isProcessing || submitMutation.isPending
                  ? t("business.checkout.processing")
                  : t("business.checkout.pay")}
              </button>

              <div className={styles.securityNotice}>
                <FaLock className={styles.securityIcon} />
                <span>{t("summary.terms")}</span>
              </div>
              <LegalSurfaceLinks
                lang={lang}
                documents={["terms", "privacy", "refund", "support"]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCheckoutPage;
