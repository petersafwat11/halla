"use client";
import { useTranslation } from "react-i18next";
import PlanCard from "@/ui/plans/PlanCard/PlanCard";

/**
 * Business plans card — thin wrapper around the shared <PlanCard>, mirroring
 * HostPlanCard so the business plans page stays visually identical to the host
 * one. Business plans arrive as a flat list per billing family
 * (event / quarterly / annual), so each plan gets its own card.
 *
 * The shared PlanCard reads `invitePool` when billingType==="monthly" and
 * `invites` otherwise; quarterly/annual are pool plans, so we normalise them
 * to "monthly" for display purposes.
 */
const BusinessPlanCard = ({
  plan,
  billingType,
  isPopular = false,
  disabled = false,
  lang = "ar",
  ctaLabel,
  onSelect,
}) => {
  const { t } = useTranslation("plans");

  if (!plan) return null;

  const cardBillingType = billingType === "event" ? "event" : "monthly";

  return (
    <PlanCard
      planFamily="business"
      matchedPlan={plan}
      plans={[plan]}
      billingType={cardBillingType}
      selectedInvites={null}
      onInviteChange={() => {}}
      isPopular={isPopular}
      lang={lang}
      ctaLabel={ctaLabel || t("buttons.subscribeNow")}
      onCtaClick={disabled ? undefined : () => onSelect?.(plan)}
    />
  );
};

export default BusinessPlanCard;
