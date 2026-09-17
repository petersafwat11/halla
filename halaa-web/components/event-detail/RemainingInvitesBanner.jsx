"use client";

import React from "react";
import { useEvent, useEventSubscriptionInfo } from "@/hooks/events";
import { getLocalized } from "@halaa/shared/utils/locale";
import { canPurchaseMoreInvites } from "@halaa/shared/utils/invitationBalance";
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
  // Customer-facing name only. The plan code ("basic_monthly_200") is an
  // internal identifier and must never be shown to a host, so it is not in
  // this chain — an empty name simply hides the row.
  const currentPlanName =
    getLocalized(currentSubscription, "planName", lang) ||
    getLocalized(currentPlan, "name", lang) ||
    currentPlan?.nameAr ||
    currentPlan?.nameEn ||
    null;

  if (!effectiveBalance) return null;

  return (
    <div className={styles.group}>
      {currentPlanName && (
        <div className={styles.currentPlan} role="note">
          {/* The note explains the rule, so it leads; the plan name is the
              supporting detail and sits at the end. */}
          <p className={styles.currentPlanNote}>{t("currentPlan.eventAllowanceNote")}</p>
          <div className={styles.currentPlanMeta}>
            <span className={styles.currentPlanLabel}>{t("currentPlan.label")}</span>
            <strong className={styles.currentPlanName} dir="auto">{currentPlanName}</strong>
          </div>
        </div>
      )}
      <InvitationBalanceCard
        balance={effectiveBalance}
        eventId={eventId}
        returnTo="event-detail"
        purchasable={canPurchaseMoreInvites({
          balance: effectiveBalance,
          subscription: currentSubscription,
          event,
        })}
      />
    </div>
  );
}
