"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaShieldAlt,
  FaEdit,
  FaLayerGroup,
  FaCheckCircle,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
} from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import useAuthStore from "@/stores/authStore";
import { plansAPI } from "@/services/adminDashboard";
import Header from "@/ui/admin/header/Header";
import StatsCards from "@/ui/host/main-page/StatsCards";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import EditPlanPopup from "./EditPlanPopup";
import styles from "./ManagePlansContent.module.css";

const getPlanTypeLabel = (planType) => {
  const labels = {
    trial: 'Trial',
    basic_event: 'Basic Event',
    basic_monthly: 'Basic Monthly',
    premium_event: 'Premium Event',
    premium_monthly: 'Premium Monthly',
    business_event: 'Business Event',
    business_quarterly: 'Business Quarterly',
    business_annual: 'Business Annual',
    unlimited: 'Unlimited',
  };
  return labels[planType] || planType;
};

const FILTER_TABS = [
  { key: 'all', label: 'All Plans' },
  { key: 'basic_event', label: 'Basic Event' },
  { key: 'basic_monthly', label: 'Basic Monthly' },
  { key: 'premium_event', label: 'Premium Event' },
  { key: 'premium_monthly', label: 'Premium Monthly' },
  { key: 'business_event', label: 'Business Event' },
  { key: 'business_quarterly', label: 'Business Quarterly' },
  { key: 'business_annual', label: 'Business Annual' },
  { key: 'trial', label: 'Trial' },
  { key: 'unlimited', label: 'Unlimited' },
];

const getAccentColor = (planType) => {
  if (planType === "trial") return "#2a8c5b";
  if (planType === "enterprise") return "var(--c-s500, #524438)";
  return "var(--c-p500, #c28e5c)";
};

export default function ManagePlansContent() {
  const { i18n } = useTranslation("admin");
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isArabic = i18n.language === "ar";
  const locale = pathname.split("/")[1];

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (user && !isSuperAdmin) {
      toast.error(isArabic ? "غير مصرح لك بالوصول" : "Access denied");
      router.push(`/${locale}/admin-dash`);
    }
  }, [user, isSuperAdmin, router, locale, isArabic]);

  const fetchPlans = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoading(true);
      const response = await plansAPI.getAllForAdmin();
      const plansData = response?.data?.plans || response?.data || [];
      if (Array.isArray(plansData)) setPlans(plansData);
    } catch {
      toast.error(isArabic ? "فشل في تحميل الباقات" : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isArabic]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const statsCards = useMemo(() => {
    const activePlans = plans.filter((p) => p.isActive).length;
    const hostCount = plans.filter(
      (p) => p.planType === "basic_event" || p.planType === "basic_monthly" || p.planType === "premium_event" || p.planType === "premium_monthly",
    ).length;
    const businessCount = plans.filter(
      (p) => p.planType === "business_event" || p.planType === "business_quarterly" || p.planType === "business_annual",
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

  if (!isSuperAdmin) {
    return (
      <div className={styles.accessDenied}>
        <FaShieldAlt className={styles.accessIcon} />
        <h2>{isArabic ? "غير مصرح" : "Access Denied"}</h2>
        <p>{isArabic ? "هذه الصفحة للمدير الأعلى فقط" : "This page is for super admin only"}</p>
      </div>
    );
  }

  if (loading) return <SimpleLoading />;

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <Header
          title={isArabic ? "إدارة الباقات والأسعار" : "Manage Plans & Pricing"}
          subtitle={
            isArabic
              ? "تعديل أسعار الباقات وحدود الضيوف والمناسبات"
              : "Edit plan pricing, guest limits, and event limits"
          }
        />
        <StatsCards cards={statsCards} />
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.filterTab} ${activeFilter === tab.key ? styles.activeTab : ""}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
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
            const planName = isArabic
              ? plan.nameAr || plan.nameEn
              : plan.nameEn || plan.nameAr;

            const price = plan.pricing?.oneTime || 0;
            const pricePeriod = isArabic ? "/ مناسبة" : "/ event";

            const maxGuests = plan.limits?.maxInvitesPerEvent ?? plan.limits?.invitePool ?? plan.limits?.maxGuestsPerEvent;
            const maxEvents = plan.limits?.maxEvents ?? plan.limits?.maxEventsPerMonth;

            return (
              <div
                key={plan.id || plan._id || plan.code}
                className={`${styles.planCard} ${!plan.isActive ? styles.inactiveCard : ""}`}
              >
                {/* Accent stripe */}
                <div className={styles.cardAccent} style={{ background: accent }} />

                {/* Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.planTitleSection}>
                    <h3 className={styles.planTitle}>{planName}</h3>
                    <code className={styles.planCode}>{plan.code}</code>
                  </div>
                  <div className={styles.cardBadges}>
                    <span
                      className={styles.typeBadge}
                      style={{ background: accent }}
                    >
                      {getPlanTypeLabel(planType)}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${plan.isActive ? styles.activeBadge : styles.inactiveBadge}`}
                    >
                      {plan.isActive
                        ? isArabic ? "نشط" : "Active"
                        : isArabic ? "معطل" : "Disabled"}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className={styles.priceSection}>
                  <div className={styles.priceAmount}>
                    <span className={styles.currency}>
                      {isArabic ? "ر.س" : "SAR"}
                    </span>
                    <span
                      className={styles.price}
                      style={{ color: accent }}
                    >
                      {price.toLocaleString()}
                    </span>
                  </div>
                  <span className={styles.pricePeriod}>{pricePeriod}</span>
                </div>

                {/* Limits */}
                <div className={styles.limitsSection}>
                  <div className={styles.limitItem}>
                    <FaUsers className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxGuests === -1 ? "∞" : (maxGuests || 0).toLocaleString()}
                    </span>
                    <span className={styles.limitLabel}>
                      {isArabic ? "دعوة" : "invites"}
                    </span>
                  </div>
                  <div className={styles.limitItem}>
                    <FaCalendarAlt className={styles.limitIcon} style={{ color: accent }} />
                    <span className={styles.limitValue}>
                      {maxEvents === -1 ? "∞" : maxEvents || 0}
                    </span>
                    <span className={styles.limitLabel}>
                      {isArabic ? "مناسبة" : "events"}
                    </span>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  className={styles.editButton}
                  onClick={() => setEditingPlan(plan)}
                >
                  <FaEdit />
                  {isArabic ? "تعديل الباقة" : "Edit Plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editingPlan && (
        <PopupLayout
          isOpen={!!editingPlan}
          onClose={() => setEditingPlan(null)}
          size="auto"
        >
          <EditPlanPopup
            plan={editingPlan}
            planType={editingPlan.planType || "basic_event"}
            onClose={() => setEditingPlan(null)}
            onSuccess={fetchPlans}
          />
        </PopupLayout>
      )}
    </div>
  );
}
