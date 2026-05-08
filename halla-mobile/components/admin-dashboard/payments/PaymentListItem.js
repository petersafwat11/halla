import React from "react";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

// Backend admin transform emits canonical `completed`, never `success`.
const STATUS_AVATAR_COLOR = {
  completed: colors.success[500],
  failed: colors.error[500],
  pending: colors.warning[500],
};

const PaymentListItem = ({ payment, onPress }) => {
  const currency = payment.currency || "SAR";
  const amount = payment.amount != null ? `${payment.amount} ${currency}` : "—";
  const avatarColor =
    STATUS_AVATAR_COLOR[payment.status] || colors.primary[500];
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
      details={details}
      onPress={onPress ? () => onPress(payment) : undefined}
    />
  );
};

export default PaymentListItem;
