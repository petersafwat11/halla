"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { IoIosArrowForward } from "react-icons/io";

import {
  CurrentPlanCard,
  BillingTypeToggle,
  AddonsSection,
  HostPlanCard,
  PaymentMethodSelector,
} from "./_components";
import Summary from "./summary/Summary";
import { useHostPlans } from "@/hooks/reactQueryHooks/usePlans";
import { useMySubscription, useSubscriptionMutation } from "@/hooks/reactQueryHooks/useSubscriptions";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./plans.module.css";

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

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const computeFeatures = (plan) => {
  const featuresObj = plan?.features;
  if (!featuresObj || Array.isArray(featuresObj)) return featuresObj || [];
  return Object.entries(FEATURE_MAP)
    .filter(([key]) => featuresObj[key])
    .map(([, val]) => val);
};

const PlansPage = () => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();
  const queryClient = useQueryClient();

  const { data: plansData, isLoading: plansLoading, error: plansError } = useHostPlans();
  const { data: subscriptionData, isLoading: subLoading, error: subError } = useMySubscription();
  const subscribeMutation = useSubscriptionMutation("subscribe");

  const [showSummary, setShowSummary] = useState(false);
  const [billingType, setBillingType] = useState("event");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState("basic");
  const [selectedInvites, setSelectedInvites] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [addonItems, setAddonItems] = useState([]);
  const [addonTotal, setAddonTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");

  const actualPlansData = plansData?.data || plansData;
  const subscription =
    subscriptionData?.data?.subscription ||
    subscriptionData?.subscription ||
    null;
  const usage = subscription?.usage || null;

  const basicPlans = useMemo(
    () => (Array.isArray(actualPlansData?.basic?.[billingType]) ? actualPlansData.basic[billingType] : []),
    [actualPlansData, billingType]
  );
  const premiumPlans = useMemo(
    () => (Array.isArray(actualPlansData?.premium?.[billingType]) ? actualPlansData.premium[billingType] : []),
    [actualPlansData, billingType]
  );

  const isLoading = plansLoading || subLoading;

  // Default the shared invite count whenever billing type changes or data loads
  useEffect(() => {
    const reference = basicPlans[0] || premiumPlans[0];
    if (reference) {
      setSelectedInvites(getInviteValue(reference, billingType));
    } else {
      setSelectedInvites(null);
    }
  }, [billingType, basicPlans, premiumPlans]);

  const handleInviteChange = useCallback((val) => {
    setSelectedInvites(val);
  }, []);

  const compensationInvites = useMemo(() => {
    if (!selectedInvites) return 0;
    return Math.floor(selectedInvites * 0.15);
  }, [selectedInvites]);

  const basicFeatures = useMemo(
    () => computeFeatures(basicPlans.find((p) => getInviteValue(p, billingType) === selectedInvites) || basicPlans[0]),
    [basicPlans, billingType, selectedInvites]
  );
  const premiumFeatures = useMemo(
    () => computeFeatures(premiumPlans.find((p) => getInviteValue(p, billingType) === selectedInvites) || premiumPlans[0]),
    [premiumPlans, billingType, selectedInvites]
  );

  const handleAddonsChange = useCallback((items, total) => {
    setAddonItems(items);
    setAddonTotal(total);
  }, []);

  const handleSubscribe = useCallback((family, plan) => {
    if (!plan) return;
    setSelectedFamily(family);
    setSelectedPlan(plan);
    setShowSummary(true);
  }, []);

  const buildSource = useCallback(() => {
    if (paymentMethod === "creditcard") {
      return {
        type: "creditcard",
        name: cardData?.name,
        number: cardData?.number,
        month: Number(cardData?.month),
        year: Number(cardData?.year),
        cvc: cardData?.cvc,
      };
    }
    if (paymentMethod === "stcpay") {
      return { type: "stcpay", mobile: stcMobile };
    }
    if (paymentMethod === "applepay") {
      // PassKit token sourcing is a separate mini-feature (§13 Q1).
      // The selector exists so the backend understands the source type.
      return { type: "applepay", token: null };
    }
    return null;
  }, [paymentMethod, cardData, stcMobile]);

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlan) return;
    try {
      const result = await subscribeMutation.mutateAsync({
        planCode: selectedPlan.code,
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: buildSource(),
      });
      if (result?.requiresAction) {
        // The mutation already redirects via window.location. Avoid the
        // success toast — the user is mid-redirect to the bank.
        return;
      }
      toast.success(t("toasts.subscriptionCreated"));
      router.push(`/${lang}/host/create-event`);
    } catch (error) {
      if (
        error.response?.status === 400 &&
        error.message?.includes("already have an active subscription")
      ) {
        toast.info(t("toasts.alreadyActive"));
        router.push(`/${lang}/host/create-event`);
      } else {
        toast.error(t("toasts.subscriptionFailed"));
      }
    }
  }, [
    selectedPlan,
    subscribeMutation,
    appliedDiscountCode,
    buildSource,
    t,
    router,
    lang,
  ]);

  const handleBack = useCallback(() => setShowSummary(false), []);

  if (showSummary) {
    return (
      <Summary
        selectedPlan={{ ...selectedPlan, price: selectedPlan?.price || 0, invites: selectedInvites }}
        planFamily={selectedFamily}
        billingType={billingType}
        addonItems={addonItems}
        addonTotal={addonTotal}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBack}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCardChange={setCardData}
        onMobileChange={setStcMobile}
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

          <div className={styles.billingToggleWrap}>
            <BillingTypeToggle
              billingType={billingType}
              onChange={(val) => {
                setBillingType(val);
                setSelectedInvites(null);
              }}
              t={t}
            />
          </div>

          <div className={styles.plansGrid}>
            <HostPlanCard
              planFamily="basic"
              plans={basicPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={handleInviteChange}
              features={basicFeatures}
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("basic", plan)}
            />
            <HostPlanCard
              planFamily="premium"
              isPopular
              plans={premiumPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={handleInviteChange}
              features={premiumFeatures}
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("premium", plan)}
            />
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
