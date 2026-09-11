"use client";

import React from "react";
import { useEvent, useEventSubscriptionInfo } from "@/hooks/events";
import { getLocalized } from "@halaa/shared/utils/locale";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import InvitationBalanceCard from "./InvitationBalanceCard";
import styles from "./RemainingInvitesBanner.module.css";

/**
 * Small stat banner on the single-event page showing how many invites the
 * host has left in their pool. Adding guests is free — invites are charged
 * only when an invitation or reminder is actually sent.
 *
 * Renders canonical InvitationBalanceCard when subscription / invitation balance is present.
 */
export default function RemainingInvitesBanner({ eventId, balance }) {
  const { t } = useTranslation("home-events");
  const { lang } = useParams();
  const { data } = useEvent(eventId);
  const { data: currentSubscriptionData } = useEventSubscriptionInfo();

  const event = data?.data?.event || data?.event;
  const effectiveBalance =
    balance ||
    event?.invitationBalance ||
    event?.subscription?.invitationBalance;
  const currentSubscription =
    currentSubscriptionData?.data?.subscription ||
    currentSubscriptionData?.data ||
    currentSubscriptionData?.subscription ||
    currentSubscriptionData;
  const currentPlan = currentSubscription?.planId || currentSubscription?.plan;
  const currentPlanName =
    getLocalized(currentSubscription, "planName", lang) ||
    getLocalized(currentPlan, "name", lang) ||
    currentSubscription?.planName?.[lang] ||
    currentSubscription?.planName ||
    currentPlan?.name ||
    currentPlan?.code ||
    currentSubscription?.planCode ||
    currentSubscription?.planType;

  if (!effectiveBalance) return null;

  return (
    <div className={styles.group}>
      {currentPlanName && (
        <div className={styles.currentPlan} role="note">
          <div>
            <span className={styles.currentPlanLabel}>{t("currentPlan.label")}</span>
            <strong className={styles.currentPlanName} dir="auto">{currentPlanName}</strong>
          </div>
          <p>{t("currentPlan.eventAllowanceNote")}</p>
        </div>
      )}
      <InvitationBalanceCard
        balance={effectiveBalance}
        eventId={eventId}
        returnTo="event-detail"
      />
    </div>
  );
}
