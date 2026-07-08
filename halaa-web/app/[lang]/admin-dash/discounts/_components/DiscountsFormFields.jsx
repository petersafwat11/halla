"use client";

import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import DatePicker from "@/ui/commen/inputs/datePicker";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import CheckBoxItems from "@/ui/commen/inputs/checkboxItems/CheckBoxItems";
import { PLAN_TYPES } from "./discountsFormUtils";
import styles from "./DiscountsFormPopup.module.css";

export default function DiscountsFormFields({ editingDiscount }) {
  const { t } = useTranslation("adminDiscounts");
  const { watch } = useFormContext();

  const discountType = watch("discountType");
  const validFrom = watch("validFrom");

  const discountTypeOptions = [
    { value: "percentage", label: t("discounts.type.percentage", "نسبة مئوية (%)") },
    { value: "fixed", label: t("discounts.type.fixed", "مبلغ ثابت (ر.س)") },
  ];

  const planTypeOptions = PLAN_TYPES.map((value) => ({
    value,
    label: t(`discounts.planTypes.${value}`, value),
  }));

  return (
    <div className={styles.grid}>
      <div className={styles.fieldFull}>
        <InputGroup
          label={t("discounts.fields.code", "كود الخصم *")}
          placeholder={t("discounts.fields.codePlaceholder", "e.g. SAVE20")}
          type="text"
          name="code"
          required
          disabled={!!editingDiscount}
        />
      </div>

      <div className={styles.field}>
        <InputGroup
          label={t("discounts.fields.descEn", "الوصف (إنجليزي)")}
          placeholder={t("discounts.fields.descEnPlaceholder", "e.g. 20% off for new users")}
          type="text"
          name="descriptionEn"
        />
      </div>

      <div className={styles.field}>
        <InputGroup
          label={t("discounts.fields.descAr", "الوصف (عربي)")}
          placeholder={t("discounts.fields.descArPlaceholder", "مثال: خصم 20% للمستخدمين الجدد")}
          type="text"
          name="descriptionAr"
        />
      </div>

      <div className={styles.field}>
        <InputSelect
          label={t("discounts.fields.type", "نوع الخصم *")}
          placeholder={t("discounts.fields.type", "نوع الخصم")}
          name="discountType"
          options={discountTypeOptions}
          required
        />
      </div>

      <div className={styles.field}>
        <InputGroup
          label={
            discountType === "percentage"
              ? t("discounts.fields.percent", "النسبة (%) *")
              : t("discounts.fields.amount", "المبلغ (ر.س) *")
          }
          type="number"
          name="value"
          required
        />
      </div>

      <div className={styles.field}>
        <InputGroup
          label={t("discounts.fields.maxUses", "الحد الأقصى للاستخدام (0 = غير محدود)")}
          type="number"
          name="maxUses"
        />
      </div>

      <div className={styles.field}>
        <InputGroup
          label={t("discounts.fields.minAmount", "الحد الأدنى للمبلغ (ر.س)")}
          type="number"
          name="minimumAmount"
        />
      </div>

      <div className={styles.field}>
        <DatePicker
          name="validFrom"
          label={t("discounts.fields.validFrom", "صالح من")}
          placeholder={t("discounts.fields.validFrom", "اختر التاريخ")}
          required={false}
        />
      </div>

      <div className={styles.field}>
        <DatePicker
          name="validUntil"
          label={t("discounts.fields.validUntil", "صالح حتى")}
          placeholder={t("discounts.fields.validUntil", "اختر التاريخ")}
          required={false}
          minDate={validFrom}
        />
      </div>

      <div className={styles.field}>
        <ToggleInput
          name="isActive"
          label={t("discounts.fields.status", "الحالة")}
        />
      </div>

      <div className={styles.fieldFull}>
        <label className={styles.label}>
          {t("discounts.fields.planTypes", "الباقات المطبقة (فارغ = جميع الباقات)")}
        </label>
        <CheckBoxItems
          name="applicablePlanTypes"
          items={planTypeOptions}
          columns={2}
        />
      </div>
    </div>
  );
}
