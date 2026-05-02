import React from "react";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import AdminListItem from "../common/AdminListItem";

const PLAN_TYPE_CONFIG = {
  single_event: { color: colors.warning[500],   bg: colors.warning[50],   labelKey: "plans.types.single_event" },
  subscription:  { color: colors.primary[500],  bg: colors.primary[50],   labelKey: "plans.types.subscription" },
  enterprise:    { color: colors.secondary[500], bg: colors.secondary[50], labelKey: "plans.types.enterprise" },
  trial:         { color: colors.natural[400],  bg: colors.natural[150],  labelKey: "plans.types.trial" },
};

const formatPrice = (amount) => {
  if (amount === undefined || amount === null) return "—";
  return `SAR ${Number(amount).toLocaleString()}`;
};

const PlanListItem = ({ plan, canEdit, onEdit }) => {
  const { t } = useTranslation("admin");
  if (!plan) return null;

  const typeConfig  = PLAN_TYPE_CONFIG[plan.planType] || PLAN_TYPE_CONFIG.trial;
  const typeLabel   = t(typeConfig.labelKey);

  const isSingleOrTrial   = plan.planType === "single_event" || plan.planType === "trial";
  const isSubOrEnterprise = plan.planType === "subscription" || plan.planType === "enterprise";

  const oneTimePrice      = plan.pricing?.direct?.oneTime ?? 0;
  const monthlyPrice      = plan.pricing?.direct?.monthly ?? 0;
  const yearlyPrice       = plan.pricing?.direct?.yearly ?? 0;
  const maxGuests         = plan.limits?.maxGuestsPerEvent ?? "—";
  const maxEvents         = plan.limits?.maxEvents ?? null;
  const maxEventsPerMonth = plan.limits?.maxEventsPerMonth ?? null;

  const eventsLimitLabel = isSubOrEnterprise
    ? maxEventsPerMonth === -1
      ? `${t("plans.labels.unlimited")} ${t("plans.labels.eventsPerMonth")}`
      : `${maxEventsPerMonth} ${t("plans.labels.eventsPerMonth")}`
    : maxEvents != null
    ? `${t("plans.labels.max")} ${maxEvents} ${maxEvents !== 1 ? t("plans.labels.events") : t("plans.labels.event")}`
    : t("plans.labels.oneEvent");

  // ── Chips: type tag + pricing ──
  const chips = [
    {
      label: typeLabel,
      color: typeConfig.color,
      bg: typeConfig.bg,
    },
    isSingleOrTrial
      ? {
          label: oneTimePrice > 0 ? formatPrice(oneTimePrice) : t("plans.labels.free"),
          color: typeConfig.color,
          bg: colors.natural[150],
          icon: "pricetag-outline",
        }
      : null,
    isSubOrEnterprise
      ? {
          label: `${formatPrice(monthlyPrice)} / ${t("plans.labels.perMonth")}`,
          color: colors.primary[500],
          bg: colors.primary[50],
          icon: "calendar-outline",
        }
      : null,
    isSubOrEnterprise && yearlyPrice > 0
      ? {
          label: `${formatPrice(yearlyPrice)} / ${t("plans.labels.perYear")}`,
          color: colors.natural[500],
          bg: colors.natural[150],
          icon: "star-outline",
        }
      : null,
  ].filter(Boolean);

  // ── Details: limits ──
  const details = [
    { icon: "people-outline", text: `${t("plans.details.maxGuests")}: ${maxGuests}` },
    { icon: "ticket-outline", text: eventsLimitLabel },
  ];

  // ── Actions: edit ──
  const actions = canEdit
    ? [
        {
          key: "edit",
          label: t("common.edit"),
          icon: "pencil-outline",
          color: colors.primary[600],
          onPress: () => onEdit && onEdit(plan),
        },
      ]
    : [];

  return (
    <AdminListItem
      title={plan.nameEn}
      subtitle={plan.code}
      avatarColor={typeConfig.color}
      status={plan.isActive ? "active" : "inactive"}
      chips={chips}
      details={details}
      actions={actions}
    />
  );
};

export default PlanListItem;
