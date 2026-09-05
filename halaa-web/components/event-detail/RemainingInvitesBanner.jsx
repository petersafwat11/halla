"use client";

import React from "react";
import { useEvent } from "@/hooks/events";
import InvitationBalanceCard from "./InvitationBalanceCard";

/**
 * Small stat banner on the single-event page showing how many invites the
 * host has left in their pool. Adding guests is free — invites are charged
 * only when an invitation or reminder is actually sent.
 *
 * Renders canonical InvitationBalanceCard when subscription / invitation balance is present.
 */
export default function RemainingInvitesBanner({ eventId, balance }) {
  const { data } = useEvent(eventId);

  const event = data?.data?.event || data?.event;
  const effectiveBalance =
    balance ||
    event?.invitationBalance ||
    event?.subscription?.invitationBalance;

  if (!effectiveBalance && !event?.subscription) return null;

  const resolvedBalance = effectiveBalance || {
    unlimited: event.subscription.invitesRemaining == null,
    base: null,
    compensation: null,
    consumed: 0,
    total: null,
    remaining: event.subscription.invitesRemaining ?? null,
  };

  return (
    <InvitationBalanceCard
      balance={resolvedBalance}
      eventId={eventId}
      returnTo="event-detail"
    />
  );
}
