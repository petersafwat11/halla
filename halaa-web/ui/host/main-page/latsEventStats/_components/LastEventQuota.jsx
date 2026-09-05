"use client";
import React from "react";
import InvitationBalanceCard from "@/components/event-detail/InvitationBalanceCard";

export default function LastEventQuota({ quota, balance, eventId }) {
  const effectiveBalance =
    balance ||
    quota?.invitationBalance ||
    (quota?.remainingInvites !== undefined
      ? {
          unlimited: quota.remainingInvites == null,
          base: null,
          compensation: null,
          consumed: 0,
          total: null,
          remaining: quota.remainingInvites,
        }
      : null);

  if (!effectiveBalance) return null;

  return (
    <InvitationBalanceCard
      balance={effectiveBalance}
      eventId={eventId}
      compact
      returnTo="dashboard"
    />
  );
}
