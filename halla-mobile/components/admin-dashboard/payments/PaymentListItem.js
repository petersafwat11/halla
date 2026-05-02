import React from "react";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const STATUS_AVATAR_COLOR = {
  success:   colors.success[500],
  completed: colors.success[500],
  failed:    colors.error[500],
  pending:   colors.warning[500],
};

const PaymentListItem = ({ payment }) => {
  const amount = payment.amount != null ? `${payment.amount} SAR` : "—";
  const avatarColor =
    STATUS_AVATAR_COLOR[payment.status] || colors.primary[500];
  const formattedDate = payment.createdAt
    ? new Date(payment.createdAt).toLocaleDateString()
    : null;

  const details = [
    formattedDate && { icon: "calendar-outline", text: formattedDate },
  ].filter(Boolean);

  return (
    <AdminListItem
      title={amount}
      subtitle={payment.hostName}
      subtitleAlt={payment.description}
      avatarColor={avatarColor}
      status={payment.status}
      details={details}
    />
  );
};

export default PaymentListItem;
