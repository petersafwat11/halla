"use client";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaShieldAlt, FaEdit, FaLayerGroup, FaCheckCircle,
  FaCalendarAlt, FaBuilding, FaUsers,
} from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useAdminPlans } from "@/hooks/reactQueryHooks/useAdmin";
import Header from "@/ui/admin/header/Header";
import StatsCards from "@/ui/host/main-page/StatsCards";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import EditPlanPopup from "./EditPlanPopup";
import styles from "./ManagePlansContent.module.css";

const PLAN_TYPE_KEYS = [
  'all', 'basic_event', 'basic_monthly', 'premium_event', 'premium_monthly',
  'business_event', 'business_quarterly', 'business_annual', 'trial', 'unlimited',
];

const getAccentColor = (planType) => {
  if (planType === "trial") return "#2a8c5b";
  if (planType === "enterprise") return "var(--c-s500, #524438)";
  return "var(--c-p500, #c28e5c)";
};

export default function ManagePlansContent() {
  const { t, i18n } = useTranslation("admin");
  const isArabic = i18n.language === "ar";
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const { data, isLoading, error } = useAdminPlans();
  const plans = useMemo(() => {
    const raw = data?.data?.plans || data?.data || data?.plans || [];
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
      { title: isArabic ? "إجمالي الباقات" : "Total Plans", value: plans.length, src: <FaLayerGroup size={24} color="var(--c-p500, #c28e5c)" />, alt: "plans" },
      { title: isArabic ? "باقات نشطة" : "Active Plans", value: activePlans, src: <FaCheckCircle size={24} color="#2a8c5b" />, alt: "active" },
      { title: isArabic ? "باقات المضيف" : "Host Plans", value: hostCount, src: <FaCalendarAlt size={24} color="var(--c-p500, #c28e5c)" />, alt: "host" },
      { title: isArabic ? "الأعمال" : "Business", value: businessCount, src: <FaBuilding size={24} color="var(--c-s500, #524438)" />, alt: "business" },
    ];
  }, [plans, isArabic]);

  const filteredPlans = useMemo(() => {
    if (activeFilter === "all") return plans;
    return plans.filter((p) => p.planType === activeFilter);
  }, [plans, activeFilter]);

  if (isLoading) return <SimpleLoading />;

  if (error) return (
    <div className={styles.accessDenied}>
      <FaShieldAlt className={styles.accessIcon} />
      <p>{error.message || (isArabic ? "فشل في تحميل الباقات" : "Failed to load plans")}</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <Header
          title={isArabic ? "إدارة الباقات والأسعار" : "Manage Plans & Pricing"}
          subtitle={isArabic
            ? "تعديل أسعار الباقات وحدود الضيوف والمناسبات"
            : "Edit plan pricing, guest limits, and event limits"}
        />
        <StatsCards cards={statsCards} />
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        {PLAN_TYPE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.filterTab} ${activeFilter === key ? styles.activeTab : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            {key === "all"
              ? isArabic ? "الكل" : "All Plans"
              : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      {filteredPlans.length === 0 ? (
        <div className={styles.emptyState}>
          <FaLayerGroup className={styles.emptyIcon} />
          <p>{isArabic ? "لا توجد باقات" : "No plans found"}</p>
        </div>
      ) : (
        <div className={styles.plansGrid}>
          {filteredPlans.map((plan) => {
            const planType = plan.planType || "direct";
            const accent = getAccentColor(planType);
            const planName = isArabic ? plan.nameAr || plan.nameEn : plan.nameEn || plan.nameAr;
            const price = plan.pricing?.oneTime || 0;
            const pricePeriod = isArabic ? "/ مناسبة" : "/ event";
            const maxGuests = plan.limits?.maxInvitesPerEvent ?? plan.limits?.invitePool ?? plan.limits?.maxGuestsPerEvent;
            const maxEvents = plan.limits?.maxEvents ?? plan.limits?.maxEventsPerMonth;

            return (
              <div
                key={plan.id || plan._id || plan.code}
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
                      {planType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className={`${styles.statusBadge} ${plan.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                      {plan.isActive
                        ? isArabic ? "نشط" : "Active"
                        : isArabic ? "معطل" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className={styles.priceSection}>
                  <div className={styles.priceAmount}>
                    <span className={styles.currency}>{isArabic ? "ر.س" : "SAR"}</span>
                    <span className={styles.price} style={{ color: accent }}>
                      {price.toLocaleString()}
                    </span>
                  </div>
                  <span className={styles.pricePeriod}>{pricePeriod}</span>
                </div>

                <div className={styles.limitsSection}>
                  <div className={styles.limitItem}>
                    <FaUsers className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxGuests === -1 ? "∞" : (maxGuests || 0).toLocaleString()}
                    </span>
                    <span className={styles.limitLabel}>{isArabic ? "دعوة" : "invites"}</span>
                  </div>
                  <div className={styles.limitItem}>
                    <FaCalendarAlt className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxEvents === -1 ? "∞" : maxEvents || 0}
                    </span>
                    <span className={styles.limitLabel}>{isArabic ? "مناسبة" : "events"}</span>
                  </div>
                </div>

                <button className={styles.editButton} onClick={() => setEditingPlan(plan)}>
                  <FaEdit />
                  {isArabic ? "تعديل الباقة" : "Edit Plan"}
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
