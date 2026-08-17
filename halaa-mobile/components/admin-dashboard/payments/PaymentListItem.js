import React from "react";
import { getStatusVisual } from "../../../constants/statusColors";
import AdminListItem from "../common/AdminListItem";

const PaymentListItem = ({ payment, onPress }) => {
  const currency = payment.currency || "SAR";
  const amount = payment.amount != null ? `${payment.amount} ${currency}` : "—";
  const avatarColor = getStatusVisual(payment.status, "payment").fg;
  const formattedDate = payment.createdAt
    ? new Date(payment.createdAt).toLocaleDateString()
    : null;

  // Method + last4 + Moyasar id mirror the web detail row for parity.
  const methodType = payment.paymentMethod?.type || payment.paymentMethod;
  const last4 = payment.paymentMethodLast4 || payment.paymentMethod?.last4;
  const methodLabel = methodType
    ? `${methodType}${last4 ? ` •••• ${last4}` : ""}`
    : null;
  const subtitleAlt = [methodLabel, payment.moyasarPaymentId].filter(Boolean).join(" · ") || payment.description;

  const details = [
    formattedDate && { icon: "calendar-outline", text: formattedDate },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={amount}
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
