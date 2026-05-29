"use client";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaShieldAlt, FaEdit, FaLayerGroup, FaCheckCircle,
  FaCalendarAlt, FaBuilding, FaUsers,
} from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useAdminPlans } from "@/hooks/admin";
import Header from "@/ui/admin/header/Header";
import StatsCards from "@/ui/host/main-page/StatsCards";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";
import EditPlanPopup from "./EditPlanPopup";
import { getLocalized } from "@/utils/locale";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";
import styles from "./ManagePlansContent.module.css";

const PLAN_TYPE_KEYS = [
  'all', 'basic_event', 'basic_monthly', 'premium_event', 'premium_monthly',
  'business_event', 'business_quarterly', 'business_annual', 'trial', 'unlimited',
];

const POOL_PLAN_TYPES = new Set([
  'business_quarterly',
  'business_annual',
  'basic_monthly',
  'premium_monthly',
  'unlimited',
]);

const isPoolPlan = (planType) => POOL_PLAN_TYPES.has(planType);

const getAccentColor = (planType) => {
  if (planType === "trial") return "#2a8c5b";
  if (planType?.startsWith("business_")) return "var(--c-s500, #524438)";
  return "var(--c-p500, #c28e5c)";
};

export default function ManagePlansContent() {
  const { t, i18n } = useTranslation("admin");
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const { data, isLoading, error } = useAdminPlans();
  const plans = useMemo(() => {
    const raw = data?.data?.plans || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const statsCards = useMemo(() => {
    const activePlans = plans.filter((p) => p.isActive).length;
    const hostCount = plans.filter((p) =>
      ["basic_event", "basic_monthly", "premium_event", "premium_monthly"].includes(p.planType),
    ).length;
    const businessCount = plans.filter((p) =>
      ["business_event", "business_quarterly", "business_annual"].includes(p.planType),
    ).length;
    return [
      { title: t("managePlans.stats.total"), value: plans.length, src: <FaLayerGroup size={24} color="var(--c-p500, #c28e5c)" />, alt: "plans" },
      { title: t("managePlans.stats.active"), value: activePlans, src: <FaCheckCircle size={24} color="#2a8c5b" />, alt: "active" },
      { title: t("managePlans.stats.host"), value: hostCount, src: <FaCalendarAlt size={24} color="var(--c-p500, #c28e5c)" />, alt: "host" },
      { title: t("managePlans.stats.business"), value: businessCount, src: <FaBuilding size={24} color="var(--c-s500, #524438)" />, alt: "business" },
    ];
  }, [plans, t]);

  const filteredPlans = useMemo(() => {
    if (activeFilter === "all") return plans;
    return plans.filter((p) => p.planType === activeFilter);
  }, [plans, activeFilter]);

  if (isLoading) return <SimpleLoading />;

  if (error) return (
    <div className={styles.accessDenied}>
      <FaShieldAlt className={styles.accessIcon} />
      <p>{error.message || t("managePlans.errors.loadFailed")}</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <Header
          title={t("managePlans.title")}
          subtitle={t("managePlans.subtitle")}
        />
        <StatsCards cards={statsCards} />
      </div>

      {/* Filter Dropdown */}
      <div className={styles.filterDropdownWrapper}>
        <SearchableSelect
          options={PLAN_TYPE_KEYS.map((key) => ({
            value: key,
            label: t(`managePlans.planTypes.${key}`),
          }))}
          value={activeFilter}
          onChange={(val) => setActiveFilter(val)}
          placeholder={t("managePlans.planTypes.all")}
          className={styles.filterDropdown}
        />
      </div>

      {/* Plan Cards */}
      {filteredPlans.length === 0 ? (
        <div className={styles.emptyState}>
          <FaLayerGroup className={styles.emptyIcon} />
          <p>{t("managePlans.empty.title")}</p>
        </div>
      ) : (
        <div className={styles.plansGrid}>
          {filteredPlans.map((plan) => {
            const planType = plan.planType || "direct";
            const accent = getAccentColor(planType);
            const planName = getLocalized(plan, "name", i18n.language);
            const price = plan.pricing?.oneTime || 0;
            const maxGuests = isPoolPlan(planType)
              ? plan.limits?.invitePool
              : plan.limits?.maxInvitesPerEvent;
            const maxEvents = plan.limits?.maxEvents;

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${!plan.isActive ? styles.inactiveCard : ""}`}
              >
                <div className={styles.cardAccent} style={{ background: accent }} />
                <div className={styles.cardHeader}>
                  <div className={styles.planTitleSection}>
                    <h3 className={styles.planTitle}>{planName}</h3>
                    <code className={styles.planCode}>{plan.code}</code>
                  </div>
                  <div className={styles.cardBadges}>
                    <span className={styles.typeBadge} style={{ background: accent }}>
                      {t(`managePlans.planTypes.${planType}`)}
                    </span>
                    <span className={`${styles.statusBadge} ${plan.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                      {plan.isActive
                        ? t("managePlans.cards.statusActive")
                        : t("managePlans.cards.statusDisabled")}
                    </span>
                  </div>
                </div>

                <div className={styles.priceSection}>
                  <div className={styles.priceAmount}>
                    <SarIcon size="1.5rem" className={styles.currency} style={{ color: accent }} />
                    <span className={styles.price} style={{ color: accent }}>
                      {price.toLocaleString()}
                    </span>
                  </div>
                  <span className={styles.pricePeriod}>{t("managePlans.pricePeriod.event")}</span>
                </div>

                <div className={styles.limitsSection}>
                  <div className={styles.limitItem}>
                    <FaUsers className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxGuests === -1 ? "∞" : (maxGuests || 0).toLocaleString()}
                    </span>
                    <span className={styles.limitLabel}>{t("managePlans.cards.invites")}</span>
                  </div>
                  <div className={styles.limitItem}>
                    <FaCalendarAlt className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxEvents === -1 ? "∞" : maxEvents || 0}
                    </span>
                    <span className={styles.limitLabel}>{t("managePlans.cards.events")}</span>
                  </div>
                </div>

                <button className={styles.editButton} onClick={() => setEditingPlan(plan)}>
                  <FaEdit />
                  {t("managePlans.cards.editButton")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editingPlan && (
        <PopupLayout isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} size="auto">
          <EditPlanPopup
            plan={editingPlan}
            planType={editingPlan.planType || "basic_event"}
            onClose={() => setEditingPlan(null)}
            onSuccess={() => setEditingPlan(null)}
          />
        </PopupLayout>
      )}
    </div>
  );
}
