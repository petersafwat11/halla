import React from "react";
import { useTranslation } from "../../../localization";
import { colors } from "../../../styles/tokens";
import { getLocalized } from "@halla/shared/utils/locale";
import { isPoolPlan } from "@halla/shared/constants/plans";
import AdminListItem from "../common/AdminListItem";

/**
 * Map a `planType` value to a colour tag + label key. Tabs are now
 * keyed by family (`host_event`, `host_monthly`, `business`, `trial`)
 * — this lookup mirrors that grouping. See `AdminPlansScreen` /
 * `PlanTabs` for the canonical mapping.
 */
const familyOf = (planType) => {
  if (!planType) return "trial";
  if (planType === "trial") return "trial";
  if (planType.startsWith("business_")) return "business";
  if (planType.endsWith("_event")) return "host_event";
  if (planType.endsWith("_monthly")) return "host_monthly";
  if (planType.endsWith("_quarterly") || planType.endsWith("_annual")) return "business";
  return "trial";
};

const FAMILY_CONFIG = {
  host_event:   { color: colors.warning[500],   bg: colors.warning[50],   labelKey: "plans.types.host_event" },
  host_monthly: { color: colors.primary[500],   bg: colors.primary[50],   labelKey: "plans.types.host_monthly" },
  business:     { color: colors.secondary[500], bg: colors.secondary[50], labelKey: "plans.types.business" },
  trial:        { color: colors.natural[400],   bg: colors.natural[150],  labelKey: "plans.types.trial" },
};

const formatPrice = (amount) => {
  if (amount === undefined || amount === null) return "—";
  return `SAR ${Number(amount).toLocaleString()}`;
};

const PlanListItem = ({ plan, canEdit, onEdit }) => {
  const { t, i18n } = useTranslation("admin");
  if (!plan) return null;

  const family = familyOf(plan.planType);
  const typeConfig = FAMILY_CONFIG[family];
  const typeLabel = t(typeConfig.labelKey);

  const isMonthly = plan.planType?.endsWith("_monthly");
  const isPool = isPoolPlan(plan.planType);

  const oneTimePrice = plan.pricing?.oneTime ?? 0;
  const maxEvents = plan.limits?.maxEvents;
  const invitePool = plan.limits?.invitePool;

  // Events line — pool plans share an invite pool across unlimited
  // events; per-event plans use `maxEvents` (with `-1` rendered as
  // "unlimited"). The pool size itself is shown in the invites row.
  const eventsLimitLabel =
    isPool || maxEvents === -1
      ? `${t("plans.labels.unlimited")} ${t("plans.labels.events")}`
      : maxEvents != null
      ? `${t("plans.labels.max")} ${maxEvents} ${maxEvents === 1 ? t("plans.labels.event") : t("plans.labels.events")}`
      : t("plans.labels.oneEvent");

  // All plan types (pool and per-event) carry an `invitePool` now.
  const invitesLabel = `${t("plans.fields.invitePool")}: ${invitePool ?? t("plans.labels.unlimited")}`;

  // ── Chips: type tag + pricing ──
  const chips = [
    { label: typeLabel, color: typeConfig.color, bg: typeConfig.bg },
    {
      label: oneTimePrice > 0 ? formatPrice(oneTimePrice) : t("plans.labels.free"),
      color: typeConfig.color,
      bg: colors.natural[150],
      icon: "pricetag-outline",
    },
    isMonthly
      ? {
          label: `${formatPrice(oneTimePrice)} / ${t("plans.labels.perMonth")}`,
          color: colors.primary[500],
          bg: colors.primary[50],
          icon: "calendar-outline",
        }
      : null,
  ].filter(Boolean);

  // ── Details: limits ──
  const details = [
    { icon: "people-outline", text: invitesLabel },
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

  const displayName = getLocalized(plan, "name", i18n.language) || plan.nameEn;

  return (
    <AdminListItem
      title={displayName}
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
