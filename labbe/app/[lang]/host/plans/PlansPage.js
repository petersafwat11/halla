"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { IoIosArrowForward } from "react-icons/io";
import { FaGift } from "react-icons/fa";

import {
  CurrentPlanCard,
  PlanFamilySelector,
  BillingTypeToggle,
  InviteSelector,
  FeaturesList,
  AddonsSection,
} from "./_components";
import Summary from "./summary/Summary";
import { useHostPlans } from "@/hooks/reactQueryHooks/usePlans";
import { useMySubscription, useSubscriptionMutation } from "@/hooks/reactQueryHooks/useSubscriptions";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./plans.module.css";

const PlansPage = () => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();
  const queryClient = useQueryClient();

  const { data: plansData, isLoading: plansLoading, error: plansError } = useHostPlans();
  const { data: subscriptionData, isLoading: subLoading, error: subError } = useMySubscription();
  const subscribeMutation = useSubscriptionMutation("subscribe");

  const [showSummary, setShowSummary] = useState(false);
  const [planFamily, setPlanFamily] = useState("basic"); // 'basic' | 'premium'
  const [billingType, setBillingType] = useState("event"); // 'event' | 'monthly'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedInvites, setSelectedInvites] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [addonItems, setAddonItems] = useState([]);
  const [addonTotal, setAddonTotal] = useState(0);

  const actualPlansData = plansData?.data || plansData;
  const subscription = subscriptionData?.data || subscriptionData;
  const usage = subscription?.usage || null;

  // New API shape: { basic: { event: [], monthly: [] }, premium: { event: [], monthly: [] } }
  const currentPlans = useMemo(
    () => (Array.isArray(actualPlansData?.[planFamily]?.[billingType]) ? actualPlansData[planFamily][billingType] : []),
    [actualPlansData, planFamily, billingType]
  );

  const isLoading = plansLoading || subLoading;

  // Auto-select first plan whenever the segment changes
  useEffect(() => {
    if (currentPlans.length > 0) {
      const first = currentPlans[0];
      setSelectedPlan(first);
      if (billingType === "event") {
        setSelectedInvites(first?.invites || first?.limits?.maxInvitesPerEvent);
      } else {
        setSelectedInvites(first?.invitePool);
      }
    } else {
      setSelectedPlan(null);
      setSelectedInvites(null);
    }
  }, [planFamily, billingType, plansData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInviteChange = useCallback(
    (val) => {
      const plan = currentPlans.find((p) =>
        billingType === "event"
          ? (p.invites || p.limits?.maxInvitesPerEvent) === val
          : p.invitePool === val
      );
      if (plan) {
        setSelectedPlan(plan);
        setSelectedInvites(val);
      }
    },
    [currentPlans, billingType]
  );

  const currentPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.price || 0;
  }, [selectedPlan]);

  const FEATURE_MAP = {
    hasInAppInvites: { icon: "mobile", labelAr: "إرسال الدعوات من التطبيق", labelEn: "In-App Invites" },
    hasWhatsAppInvites: { icon: "whatsapp", labelAr: "دعوات واتساب", labelEn: "WhatsApp Invites" },
    hasSMSInvites: { icon: "sms", labelAr: "دعوات رسائل نصية", labelEn: "SMS Invites" },
    hasQRCode: { icon: "qrcode", labelAr: "رمز QR للدخول", labelEn: "QR Code Entry" },
    hasQRScanning: { icon: "scan", labelAr: "مسح QR", labelEn: "QR Scanning" },
    hasFlexibleEntryMode: { icon: "flexible", labelAr: "وضع دخول مرن", labelEn: "Flexible Entry Mode" },
    hasStaffCheckIn: { icon: "staff", labelAr: "إدارة الموظفين", labelEn: "Staff Check-in" },
    hasStaffAssignment: { icon: "gate", labelAr: "تعيين فريق العمل", labelEn: "Staff Assignment" },
    hasRSVPTracking: { icon: "rsvp", labelAr: "تتبع الحضور", labelEn: "RSVP Tracking" },
    hasAutoReminders: { icon: "reminder", labelAr: "تذكيرات تلقائية", labelEn: "Auto Reminders" },
    hasEmailNotifications: { icon: "email", labelAr: "إشعارات بريد إلكتروني", labelEn: "Email Notifications" },
    hasCompensationInvites: { icon: "gift", labelAr: "دعوات تعويضية", labelEn: "Compensation Invites" },
    hasBasicTemplates: { icon: "template", labelAr: "قوالب أساسية", labelEn: "Basic Templates" },
  };

  const features = useMemo(() => {
    const featuresObj = selectedPlan?.features;
    if (!featuresObj || Array.isArray(featuresObj)) return featuresObj || [];
    return Object.entries(FEATURE_MAP)
      .filter(([key]) => featuresObj[key])
      .map(([, val]) => val);
  }, [selectedPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const compensationInvites = useMemo(() => {
    if (!selectedInvites) return 0;
    return Math.floor(selectedInvites * 0.15);
  }, [selectedInvites]);

  const handleAddonsChange = useCallback((items, total) => {
    setAddonItems(items);
    setAddonTotal(total);
  }, []);

  const handleCheckout = useCallback(() => {
    if (selectedPlan) setShowSummary(true);
  }, [selectedPlan]);

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlan) return;
    try {
      await subscribeMutation.mutateAsync({
        planCode: selectedPlan.code,
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
      });
      toast.success(t("toasts.subscriptionCreated"));
      router.push(`/${lang}/host/create-event`);
    } catch (error) {
      if (error.status === 400 && error.message?.includes("already have an active subscription")) {
        toast.info(t("toasts.alreadyActive"));
        router.push(`/${lang}/host/create-event`);
      } else {
        toast.error(t("toasts.subscriptionFailed"));
      }
    }
  }, [selectedPlan, subscribeMutation, appliedDiscountCode, t, router, lang]);

  const handleBack = useCallback(() => setShowSummary(false), []);

  if (showSummary) {
    return (
      <Summary
        selectedPlan={{ ...selectedPlan, price: currentPrice, invites: selectedInvites }}
        planFamily={planFamily}
        billingType={billingType}
        addonItems={addonItems}
        addonTotal={addonTotal}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <IoIosArrowForward
            onClick={() => router.push(`/${lang}/host`)}
            className={styles.backArrow}
          />
          {t("pageTitle")}
        </h1>
        <p className={styles.pageSubtitle}>{t("pageSubtitle")}</p>
      </div>

      {isLoading ? (
        <SimpleLoading message={t("loading")} />
      ) : plansError || subError ? (
        <div className={styles.errorState}>
          <p>{t("errors.loadFailed")}</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["plans"] });
              queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            }}
          >
            {t("loading")}
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          <CurrentPlanCard subscription={subscription} usage={usage} />

          <PlanFamilySelector
            planFamily={planFamily}
            onChange={(val) => {
              setPlanFamily(val);
              setSelectedInvites(null);
            }}
            t={t}
          />

          <BillingTypeToggle
            billingType={billingType}
            onChange={(val) => {
              setBillingType(val);
              setSelectedInvites(null);
            }}
            t={t}
          />

          <div className={styles.mainPlanCard}>
            <div className={styles.planHeader}>
              <div className={styles.planTitleSection}>
                <h2 className={styles.planTitle}>{t(`planFamilies.${planFamily}`)}</h2>
                <p className={styles.planDescription}>{t(`planDescriptions.${planFamily}`)}</p>
              </div>
              <div className={styles.priceSection}>
                <div className={styles.priceAmount}>
                  <span className={styles.currency}>{String(t("currency") || "SAR")}</span>
                  <span className={styles.price}>{String(currentPrice || 0)}</span>
                </div>
                <span className={styles.pricePeriod}>
                  {billingType === "monthly" ? t("pricePeriods.monthly") : t("pricePeriods.event")}
                </span>
              </div>
            </div>

            <InviteSelector
              plans={currentPlans}
              billingType={billingType}
              selectedValue={selectedInvites}
              onChange={handleInviteChange}
            />

            <FeaturesList features={features} title={t("features.title")} />

            <div className={styles.compensationSection}>
              <FaGift className={styles.compensationIcon} />
              <div className={styles.compensationContent}>
                <span className={styles.compensationTitle}>{t("compensation.title")}</span>
                <span className={styles.compensationValue}>
                  {compensationInvites} {t("compensation.invites")}
                </span>
              </div>
            </div>

            <button className={styles.subscribeButton} onClick={handleCheckout}>
              {t("buttons.subscribeNow")}
            </button>
          </div>

          <AddonsSection onAddonsChange={handleAddonsChange} />

          <div className={styles.infoNote}>
            <span className={styles.infoIcon}>💡</span>
            <p>{String(t("infoNote") || "")}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;
