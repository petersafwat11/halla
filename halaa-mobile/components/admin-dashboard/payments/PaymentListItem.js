import React from "react";
import { useTranslation } from "../../../localization";
import { formatCurrency, formatDate } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { getStatusVisual } from "../../../constants/statusColors";
import AdminListItem from "../common/AdminListItem";

const PaymentListItem = ({ payment, onPress }) => {
  const { currentLanguage } = useTranslation("admin");
  const currency = payment.currency || "SAR";

  // A price is ONE atomic locale-formatted token (blueprint §6): the number
  // and currency can never split or reorder under RTL. The first-strong
  // isolate matches PlanListItem's price contract.
  const amount =
    payment.amount != null
      ? isolateAuto(formatCurrency(payment.amount, currentLanguage, currency))
      : "—";
  const avatarColor = getStatusVisual(payment.status, "payment").fg;
  const formattedDate = payment.createdAt
    ? formatDate(payment.createdAt, currentLanguage)
    : null;

  // Method + last4 + Moyasar id mirror the web detail row for parity. Every
  // fragment is intrinsically LTR card/ID data; each one is isolated BEFORE
  // joining so the "·" separator cannot bind neighbouring tokens together.
  const methodType = payment.paymentMethod?.type || payment.paymentMethod;
  const last4 = payment.paymentMethodLast4 || payment.paymentMethod?.last4;
  const methodLabel = methodType
    ? isolateLtr(`${methodType}${last4 ? ` •••• ${last4}` : ""}`)
    : null;
  const subtitleAlt =
    [methodLabel, payment.moyasarPaymentId && isolateLtr(payment.moyasarPaymentId)]
      .filter(Boolean)
      .join(" · ") || payment.description;

  const details = [
    formattedDate && { icon: "calendar-outline", text: formattedDate },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={amount}
      // Host name is user content — AdminListItem resolves it first-strong.
      subtitle={payment.hostName}
      subtitleAlt={subtitleAlt}
      avatarColor={avatarColor}
      status={payment.status}
      statusDomain="payment"
      details={details}
      onPress={onPress ? () => onPress(payment) : undefined}
    />
  );
};

export default PaymentListItem;
