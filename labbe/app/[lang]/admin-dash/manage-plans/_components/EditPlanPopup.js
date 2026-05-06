"use client";
import React, { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import Image from "next/image";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import { editPlanSchema } from "@/utils/schemas/planSchema";
import { plansAPI } from "@/services/adminDashboard";
import styles from "./EditPlanPopup.module.css";

const EditPlanPopup = ({ plan, onClose, onSuccess, planType }) => {
  const { t, i18n } = useTranslation("admin");
  const [isLoading, setIsLoading] = useState(false);
  const isArabic = i18n.language === "ar";

  const showOneTime = planType === "single_event" || planType === "trial";
  const showMonthlyYearly =
    planType === "subscription" || planType === "enterprise";

  const methods = useForm({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      nameAr: plan?.nameAr || "",
      nameEn: plan?.nameEn || "",
      pricing: {
        direct: {
          oneTime: plan?.pricing?.direct?.oneTime || 0,
          monthly: plan?.pricing?.direct?.monthly || 0,
          yearly: plan?.pricing?.direct?.yearly || 0,
        },
        managed: {
          oneTime: plan?.pricing?.managed?.oneTime || 0,
          monthly: plan?.pricing?.managed?.monthly || 0,
          yearly: plan?.pricing?.managed?.yearly || 0,
        },
      },
      limits: {
        maxEvents: plan?.limits?.maxEvents || 1,
        maxEventsPerMonth: plan?.limits?.maxEventsPerMonth ?? -1,
        maxGuestsPerEvent: plan?.limits?.maxGuestsPerEvent || 50,
      },
      isActive: plan?.isActive !== false,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = methods;

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        pricing: {
          oneTime: data.pricing.direct.oneTime,
          monthly: data.pricing.direct.monthly,
          yearly: data.pricing.direct.yearly,
        },
        limits: data.limits,
        isActive: data.isActive,
      };
      await plansAPI.updatePlan(plan.code, payload);
      toastUtils.success(isArabic ? "تم حفظ التغييرات بنجاح" : "Changes saved successfully");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      handleError(error, null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>
            {isArabic ? "تعديل الباقة" : "Edit Plan"}
          </h2>
          <span className={styles.planCode}>{plan?.code}</span>
        </div>
        <button onClick={onClose} className={styles.closeButton}>
          <Image
            width={24}
            height={24}
            src="/svg/admin/close.svg"
            alt="close"
          />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.body}>
          {/* Plan Names */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "معلومات الباقة" : "Plan Information"}
            </h3>
            <div className={styles.row}>
              <Controller
                name="nameAr"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "الاسم بالعربية" : "Arabic Name"}
                    placeholder={
                      isArabic ? "ادخل الاسم بالعربية" : "Enter Arabic name"
                    }
                    type="text"
                    name="nameAr"
                    hintMessage={errors.nameAr?.message}
                    required={true}
                    error={!!errors.nameAr}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="nameEn"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "الاسم بالإنجليزية" : "English Name"}
                    placeholder={
                      isArabic ? "ادخل الاسم بالإنجليزية" : "Enter English name"
                    }
                    type="text"
                    name="nameEn"
                    hintMessage={errors.nameEn?.message}
                    required={true}
                    error={!!errors.nameEn}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "التسعير (مباشر)" : "Pricing (Direct)"}
            </h3>
            <div className={styles.row}>
              {showOneTime && (
                <Controller
                  name="pricing.direct.oneTime"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      label={
                        isArabic ? "سعر المناسبة الواحدة" : "One-time Price"
                      }
                      placeholder="0"
                      type="number"
                      name="pricing.direct.oneTime"
                      hintMessage={errors.pricing?.direct?.oneTime?.message}
                      error={!!errors.pricing?.direct?.oneTime}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      prefixText="SAR"
                    />
                  )}
                />
              )}
              {showMonthlyYearly && (
                <>
                  <Controller
                    name="pricing.direct.monthly"
                    control={control}
                    render={({ field }) => (
                      <InputGroup
                        label={isArabic ? "السعر الشهري" : "Monthly Price"}
                        placeholder="0"
                        type="number"
                        name="pricing.direct.monthly"
                        hintMessage={errors.pricing?.direct?.monthly?.message}
                        error={!!errors.pricing?.direct?.monthly}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        prefixText="SAR"
                      />
                    )}
                  />
                  <Controller
                    name="pricing.direct.yearly"
                    control={control}
                    render={({ field }) => (
                      <InputGroup
                        label={isArabic ? "السعر السنوي" : "Yearly Price"}
                        placeholder="0"
                        type="number"
                        name="pricing.direct.yearly"
                        hintMessage={errors.pricing?.direct?.yearly?.message}
                        error={!!errors.pricing?.direct?.yearly}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        prefixText="SAR"
                      />
                    )}
                  />
                </>
              )}
            </div>
          </div>

          {/* Limits Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "الحدود" : "Limits"}
            </h3>
            <div className={styles.row}>
              <Controller
                name="limits.maxGuestsPerEvent"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={
                      isArabic ? "الحد الأقصى للضيوف" : "Max Guests per Event"
                    }
                    placeholder="50"
                    type="number"
                    name="limits.maxGuestsPerEvent"
                    hintMessage={errors.limits?.maxGuestsPerEvent?.message}
                    error={!!errors.limits?.maxGuestsPerEvent}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              {showOneTime && (
                <Controller
                  name="limits.maxEvents"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      label={isArabic ? "عدد المناسبات" : "Max Events"}
                      placeholder="1"
                      type="number"
                      name="limits.maxEvents"
                      hintMessage={errors.limits?.maxEvents?.message}
                      error={!!errors.limits?.maxEvents}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              )}
              {showMonthlyYearly && (
                <Controller
                  name="limits.maxEventsPerMonth"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      label={
                        isArabic
                          ? "المناسبات شهرياً (-1 = غير محدود)"
                          : "Events per Month (-1 = unlimited)"
                      }
                      placeholder="-1"
                      type="number"
                      name="limits.maxEventsPerMonth"
                      hintMessage={errors.limits?.maxEventsPerMonth?.message}
                      error={!!errors.limits?.maxEventsPerMonth}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className={styles.section}>
            <ToggleInput
              name="isActive"
              label={isArabic ? "الباقة نشطة" : "Plan Active"}
              description={
                isArabic
                  ? "عند التعطيل، لن تظهر الباقة للمستخدمين الجدد"
                  : "When disabled, the plan won't be visible to new users"
              }
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={isLoading}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className={styles.save}
              disabled={isLoading || !isDirty}
            >
              {isLoading
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ التغييرات"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default EditPlanPopup;
