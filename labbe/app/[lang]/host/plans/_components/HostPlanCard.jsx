"use client";
import { useTranslation } from "react-i18next";
import PlanCard from "@/ui/plans/PlanCard/PlanCard";

const getOptionValue = (plan, billingType) => {
  if (!plan) return 0;
  if (billingType === "monthly") return plan.invitePool ?? 0;
  return plan.invites ?? 0;
};

/**
 * Host plans dashboard card — thin wrapper around the shared <PlanCard>
 * so the page and the landing pricing section stay visually identical.
 */
const HostPlanCard = ({
  planFamily,
  isPopular = false,
  plans = [],
  billingType,
  selectedInvites,
  onInviteChange,
  onSubscribe,
  lang = "ar",
}) => {
  const { t } = useTranslation("plans");

  const matchedPlan =
    plans.find((p) => getOptionValue(p, billingType) === selectedInvites) ||
    plans[0] ||
    null;

  return (
    <PlanCard
      planFamily={planFamily}
      matchedPlan={matchedPlan}
      plans={plans}
      billingType={billingType}
      selectedInvites={selectedInvites}
      onInviteChange={onInviteChange}
      isPopular={isPopular}
      lang={lang}
      ctaLabel={t("buttons.subscribeNow")}
      onCtaClick={onSubscribe}
    />
  );
};

export default HostPlanCard;
