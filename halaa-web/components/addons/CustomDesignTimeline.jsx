"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaClock, FaWhatsapp, FaExclamationTriangle } from "react-icons/fa";
import {
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_FULFILLMENT_SEQUENCE,
  DESIGN_TEMPLATE_TIERS,
} from "@halaa/shared/constants/addons";
import {
  SUPPORT_SOURCE,
  buildSupportRequest,
} from "@halaa/shared/support";
import { formatDateTime, formatCurrency } from "@halaa/shared/utils/locale";
import styles from "./CustomDesignTimeline.module.css";

const STATUS_CLASS = {
  [DESIGN_FULFILLMENT_STATUS.PAID]: styles.statusPaid,
  [DESIGN_FULFILLMENT_STATUS.QUEUED]: styles.statusQueued,
  [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: styles.statusInProgress,
  [DESIGN_FULFILLMENT_STATUS.FULFILLED]: styles.statusFulfilled,
};

export default function CustomDesignTimeline({ addon }) {
  const { t, i18n } = useTranslation("plans");
  const locale = i18n.language || "ar";
  const isAr = locale.startsWith("ar");

  if (!addon) return null;

  const currentStatus = addon.status;
  const fulfillment = addon.fulfillment || {};
  const isRefunded =
    currentStatus === "refunded" ||
    currentStatus === "refund_required" ||
    Boolean(addon.refundState);

  const tierMap = new Map();
  DESIGN_TEMPLATE_TIERS.forEach((tier) => {
    tierMap.set(tier.type, isAr ? tier.nameAr : tier.nameEn);
  });

  const tierDisplayName =
    tierMap.get(addon.templateType) ||
    addon.templateType ||
    t("addons.fulfillment.customDesignTitle", "تصميم دعوة مخصص");

  const orderId = addon.id || addon._id || "";
  const orderRef = orderId ? orderId.slice(-8).toUpperCase() : "";

  // Sequential status evaluation: never mark future steps complete
  const currentIndex = DESIGN_FULFILLMENT_SEQUENCE.indexOf(currentStatus);

  const steps = [
    {
      status: DESIGN_FULFILLMENT_STATUS.PAID,
      title: t("addons.fulfillment.stepPaid", "تم استلام الطلب"),
      timestamp: fulfillment.requestedAt || addon.createdAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.QUEUED,
      title: t("addons.fulfillment.stepQueued", "في قائمة الانتظار"),
      timestamp: fulfillment.queuedAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
      title: t("addons.fulfillment.stepInProgress", "قيد التنفيذ"),
      timestamp: fulfillment.inProgressAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.FULFILLED,
      title: t("addons.fulfillment.stepFulfilled", "تم إكمال التصميم وتوصيله"),
      timestamp: fulfillment.fulfilledAt,
    },
  ];

  const handleSupportClick = () => {
    const supportReq = buildSupportRequest({
      language: isAr ? "ar" : "en",
      source: SUPPORT_SOURCE.ADDON_FULFILLMENT,
      reference: { kind: "addon", value: String(orderId) },
    });
    if (typeof window !== "undefined" && supportReq.webUrl) {
      window.open(supportReq.webUrl, "_blank", "noopener,noreferrer");
    }
  };

  const statusLabels = {
    [DESIGN_FULFILLMENT_STATUS.PAID]: t("addons.fulfillment.statusPaid", "مدفوع"),
    [DESIGN_FULFILLMENT_STATUS.QUEUED]: t("addons.fulfillment.statusQueued", "في الانتظار"),
    [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: t("addons.fulfillment.statusInProgress", "قيد التنفيذ"),
    [DESIGN_FULFILLMENT_STATUS.FULFILLED]: t("addons.fulfillment.statusFulfilled", "مكتمل ومسلّم"),
    refund_required: t("addons.fulfillment.statusRefundRequired", "قيد المراجعة والاسترداد"),
    refunded: t("addons.fulfillment.statusRefunded", "مسترد"),
  };

  return (
    <div className={styles.card} data-testid="custom-design-timeline">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3 className={styles.tierName}>{tierDisplayName}</h3>
          {orderRef && (
            <span className={styles.orderRef}>
              {t("addons.fulfillment.orderRef", "رقم المرجع")}: {orderRef}
            </span>
          )}
        </div>
        <div className={styles.headerBadges}>
          <span className={`${styles.statusPill} ${STATUS_CLASS[currentStatus] || styles.statusPaid}`}>
            {statusLabels[currentStatus] || currentStatus}
          </span>
          {addon.price != null && (
            <span className={styles.priceTag}>
              {formatCurrency(addon.price, locale, addon.currency || "SAR")}
            </span>
          )}
        </div>
      </div>

      {/* Distinct Refund Banner if applicable */}
      {isRefunded && (
        <div className={styles.refundBanner}>
          <FaExclamationTriangle />
          <span>
            {currentStatus === "refunded"
              ? t("addons.fulfillment.refundedNotice", "تم استرداد هذا الطلب.")
              : t("addons.fulfillment.refundRequiredNotice", "هذا الطلب قيد مراجعة الاسترداد.")}
          </span>
        </div>
      )}

      {/* Expected Delivery Banner: ONLY if present */}
      {fulfillment.expectedDeliveryAt && !isRefunded && (
        <div className={styles.expectedDeliveryBanner}>
          <FaClock />
          <span>
            {t("addons.fulfillment.expectedDeliveryPrefix", "موعد التسليم المتوقع:")}{" "}
            <strong className={styles.deliveryHighlight}>
              {formatDateTime(fulfillment.expectedDeliveryAt, locale)}
            </strong>
          </span>
        </div>
      )}

      {/* Customer Note if provided by designer/admin */}
      {fulfillment.customerNote && (
        <div className={styles.customerNoteBanner}>
          <strong>{t("addons.fulfillment.designerNote", "ملاحظة فريق التصميم:")} </strong>
          {fulfillment.customerNote}
        </div>
      )}

      {/* Sequential Timeline: never mark future steps complete */}
      <div className={styles.timeline}>
        {steps.map((step, idx) => {
          const isCompleted =
            !isRefunded &&
            currentIndex >= 0 &&
            (idx < currentIndex || (idx === currentIndex && currentStatus === DESIGN_FULFILLMENT_STATUS.FULFILLED));
          const isCurrent =
            !isRefunded &&
            idx === currentIndex &&
            currentStatus !== DESIGN_FULFILLMENT_STATUS.FULFILLED;
          const isUpcoming = !isCompleted && !isCurrent;

          let stateClass = styles.stepUpcoming;
          if (isCompleted) stateClass = styles.stepCompleted;
          else if (isCurrent) stateClass = styles.stepCurrent;

          return (
            <div key={step.status} className={styles.timelineStep}>
              <div className={`${styles.stepIconWrap} ${stateClass}`}>
                {isCompleted ? (
                  <FaCheck size={14} />
                ) : isCurrent ? (
                  <FaClock size={14} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepTimestamp}>
                {step.timestamp ? formatDateTime(step.timestamp, locale) : "-"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Support launcher with opaque order reference */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.supportBtn}
          onClick={handleSupportClick}
          aria-label={t("addons.fulfillment.contactSupport", "تواصل مع الدعم بخصوص هذا الطلب")}
        >
          <FaWhatsapp size={16} />
          <span>{t("addons.fulfillment.contactSupport", "تواصل مع الدعم بخصوص هذا الطلب")}</span>
        </button>
      </div>
    </div>
  );
}
