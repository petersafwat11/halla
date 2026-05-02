"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { hostSubscriptionSchema } from "@/utils/schemas/adminPopupSchemas";
import { getHostPlans } from "@/services/plansService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddHostPopup.module.css";

export default function HostSubscriptionPopup({ host, onClose }) {
  const { t, i18n } = useTranslation("adminDashboard");
  const isArabic = i18n.language === "ar";
  const updateSubscription = useAdminHostMutation("updateSubscription");

  // Dynamic plans state
  const [hostPlans, setHostPlans] = useState({ singleEvent: [], monthly: [] });
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [billingCycle, setBillingCycle] = useState(
    host?.subscription?.billingCycle || "monthly",
  );

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getHostPlans();
        const data = res?.data || {};
        setHostPlans({
          singleEvent: data.singleEvent || [],
          monthly: data.monthly || [],
        });
      } catch {
        // plans fetch failed — fall back to empty; user can still type a code
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const planOptions = useMemo(() => {
    const singles = hostPlans.singleEvent.map((p) => ({
      label: isArabic ? (p.nameAr || p.nameEn || p.code) : (p.nameEn || p.code),
      value: p.code,
      isMonthly: false,
    }));
    const monthly = hostPlans.monthly.map((p) => ({
      label: `${isArabic ? (p.nameAr || p.nameEn || p.code) : (p.nameEn || p.code)} (${isArabic ? "اشتراك" : "Sub"})`,
      value: p.code,
      isMonthly: true,
    }));
    return [
      { label: isArabic ? "تجريبي" : "Trial", value: "trial", isMonthly: false },
      ...singles,
      ...monthly,
    ];
  }, [hostPlans, isArabic]);

  const statusOptions = [
    { label: isArabic ? "نشط" : "Active",     value: "active" },
    { label: isArabic ? "منتهي" : "Expired",  value: "expired" },
    { label: isArabic ? "ملغي" : "Cancelled", value: "cancelled" },
  ];

  const billingCycleOptions = [
    { label: isArabic ? "شهري" : "Monthly", value: "monthly" },
    { label: isArabic ? "سنوي" : "Yearly",  value: "yearly" },
  ];

  const methods = useForm({
    resolver: zodResolver(hostSubscriptionSchema),
    defaultValues: {
      planCode: host?.subscription?.planId?.code || host?.subscription?.planType || "",
      status: host?.subscription?.status || "active",
    },
  });

  const watchedPlanCode = methods.watch("planCode");
  const selectedPlanObj = planOptions.find((p) => p.value === watchedPlanCode);
  const showBillingCycle = selectedPlanObj?.isMonthly;

  const onSubmit = async (data) => {
    try {
      await updateSubscription.mutateAsync({
        hostId: host.id || host._id,
        planCode: data.planCode,
        status: data.status,
        ...(showBillingCycle && { billingCycle }),
      });
      toast.success(
        isArabic ? "تم تحديث الاشتراك بنجاح" : "Subscription updated successfully",
      );
      onClose();
    } catch (error) {
      toast.error(
        error.message ||
          (isArabic ? "فشل تحديث الاشتراك" : "Failed to update subscription"),
      );
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{isArabic ? "تحديث الاشتراك" : "Update Subscription"}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{isArabic ? "اسم المضيف" : "Host Name"}</label>
              <input
                type="text"
                value={host?.name || host?.username || ""}
                disabled
                style={{ background: "#f5f5f5" }}
              />
            </div>

            {isLoadingPlans ? (
              <div className={styles.formGroup}>
                <p style={{ color: "#888", fontSize: 14 }}>
                  {isArabic ? "جاري تحميل الخطط..." : "Loading plans..."}
                </p>
              </div>
            ) : (
              <InputSelect
                label={isArabic ? "الخطة" : "Plan"}
                placeholder={isArabic ? "اختر خطة" : "Select a plan"}
                name="planCode"
                options={planOptions}
                required
              />
            )}

            <InputSelect
              label={isArabic ? "الحالة" : "Status"}
              placeholder={isArabic ? "اختر الحالة" : "Select status"}
              name="status"
              options={statusOptions}
              required
            />

            {showBillingCycle && (
              <div className={styles.formGroup}>
                <label>{isArabic ? "دورة الفوترة" : "Billing Cycle"}</label>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {billingCycleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBillingCycle(opt.value)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1.5px solid",
                        borderColor: billingCycle === opt.value ? "#c28e5c" : "#dfdfdf",
                        backgroundColor: billingCycle === opt.value ? "#f5ece4" : "#fff",
                        color: billingCycle === opt.value ? "#c28e5c" : "#555",
                        fontWeight: billingCycle === opt.value ? 600 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={isArabic ? "إلغاء" : "Cancel"}
                onClick={onClose}
                disabled={updateSubscription.isPending}
              />
              <Button
                variant="primary"
                title={updateSubscription.isPending
                  ? isArabic ? "جاري التحديث..." : "Updating..."
                  : isArabic ? "تحديث" : "Update"}
                type="submit"
                disabled={updateSubscription.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
