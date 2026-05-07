"use client";

import { useTranslation } from "react-i18next";
import { FaCheck, FaTimes } from "react-icons/fa";
import { PLAN_TYPES } from "./discountsFormUtils";
import styles from "./DiscountsFormPopup.module.css";

export default function DiscountsFormFields({
  form,
  errors,
  set,
  togglePlanType,
  editingDiscount,
}) {
  const { t } = useTranslation("adminDashboard");

  return (
    <div className={styles.grid}>
      <div className={styles.fieldFull}>
        <label className={styles.label}>
          {t("discounts.fields.code", "كود الخصم *")}
        </label>
        <input
          className={`${styles.input} ${errors.code ? styles.inputError : ""}`}
          type="text"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder={t("discounts.fields.codePlaceholder", "e.g. SAVE20")}
          disabled={!!editingDiscount}
        />
        {errors.code && <span className={styles.error}>{errors.code}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.descEn", "الوصف (إنجليزي)")}
        </label>
        <input
          className={styles.input}
          type="text"
          value={form.descriptionEn}
          onChange={(e) => set("descriptionEn", e.target.value)}
          placeholder={t("discounts.fields.descEnPlaceholder", "e.g. 20% off for new users")}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.descAr", "الوصف (عربي)")}
        </label>
        <input
          className={styles.input}
          type="text"
          dir="rtl"
          value={form.descriptionAr}
          onChange={(e) => set("descriptionAr", e.target.value)}
          placeholder={t("discounts.fields.descArPlaceholder", "مثال: خصم 20% للمستخدمين الجدد")}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.type", "نوع الخصم *")}
        </label>
        <select
          className={styles.input}
          value={form.discountType}
          onChange={(e) => set("discountType", e.target.value)}
        >
          <option value="percentage">
            {t("discounts.type.percentage", "نسبة مئوية (%)")}
          </option>
          <option value="fixed">
            {t("discounts.type.fixed", "مبلغ ثابت (ر.س)")}
          </option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {form.discountType === "percentage"
            ? t("discounts.fields.percent", "النسبة (%) *")
            : t("discounts.fields.amount", "المبلغ (ر.س) *")}
        </label>
        <input
          className={`${styles.input} ${errors.value ? styles.inputError : ""}`}
          type="number"
          min="0"
          max={form.discountType === "percentage" ? 100 : undefined}
          value={form.value}
          onChange={(e) => set("value", e.target.value)}
        />
        {errors.value && <span className={styles.error}>{errors.value}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.maxUses", "الحد الأقصى للاستخدام (0 = غير محدود)")}
        </label>
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.maxUses}
          onChange={(e) => set("maxUses", e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.minAmount", "الحد الأدنى للمبلغ (ر.س)")}
        </label>
        <input
          className={styles.input}
          type="number"
          min="0"
          value={form.minimumAmount}
          onChange={(e) => set("minimumAmount", e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.validFrom", "صالح من")}
        </label>
        <input
          className={styles.input}
          type="date"
          value={form.validFrom}
          onChange={(e) => set("validFrom", e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.validUntil", "صالح حتى")}
        </label>
        <input
          className={`${styles.input} ${errors.validUntil ? styles.inputError : ""}`}
          type="date"
          value={form.validUntil}
          onChange={(e) => set("validUntil", e.target.value)}
        />
        {errors.validUntil && (
          <span className={styles.error}>{errors.validUntil}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          {t("discounts.fields.status", "الحالة")}
        </label>
        <button
          type="button"
          className={`${styles.statusToggle} ${form.isActive ? styles.statusActive : styles.statusInactive}`}
          onClick={() => set("isActive", !form.isActive)}
        >
          {form.isActive ? (
            <><FaCheck /> {t("discounts.status.active", "نشط")}</>
          ) : (
            <><FaTimes /> {t("discounts.status.inactive", "معطل")}</>
          )}
        </button>
      </div>

      <div className={styles.fieldFull}>
        <label className={styles.label}>
          {t("discounts.fields.planTypes", "الباقات المطبقة (فارغ = جميع الباقات)")}
        </label>
        <div className={styles.chips}>
          {PLAN_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.chip} ${
                form.applicablePlanTypes.includes(value) ? styles.chipActive : ""
              }`}
              onClick={() => togglePlanType(value)}
            >
              {t(`discounts.planTypes.${value}`, value)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
