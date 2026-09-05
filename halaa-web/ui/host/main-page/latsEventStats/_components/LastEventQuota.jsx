"use client";
import React from "react";
import InvitationBalanceCard from "@/components/event-detail/InvitationBalanceCard";

export default function LastEventQuota({ balance, eventId }) {
  if (!balance) return null;

  return (
    <InvitationBalanceCard
      balance={balance}
      eventId={eventId}
      compact
      returnTo="dashboard"
    />
  );
}
