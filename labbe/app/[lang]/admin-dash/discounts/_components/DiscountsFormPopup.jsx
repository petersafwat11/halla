"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FaCheck, FaTimes } from "react-icons/fa";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import { discountsAPI } from "@/services/adminDashboard";
import styles from "./DiscountsFormPopup.module.css";

const PLAN_TYPE_OPTIONS = [
  { value: "single_event", en: "Single Event", ar: "مناسبة واحدة" },
  { value: "subscription", en: "Subscription", ar: "اشتراك" },
  { value: "enterprise", en: "Enterprise", ar: "مؤسسات" },
  { value: "trial", en: "Trial", ar: "تجريبي" },
  { value: "lite", en: "Lite", ar: "لايت" },
  { value: "pro", en: "Pro", ar: "برو" },
  { value: "elite", en: "Elite", ar: "إيليت" },
];

const EMPTY_FORM = {
  code: "",
  descriptionEn: "",
  descriptionAr: "",
  discountType: "percentage",
  value: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  isActive: true,
  applicablePlanTypes: [],
  minimumAmount: "",
};

export default function DiscountsFormPopup({ isOpen, onClose, editingDiscount }) {
  const { t, i18n } = useTranslation("adminDashboard");
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (editingDiscount) {
      setForm({
        code: editingDiscount.code || "",
        descriptionEn: editingDiscount.descriptionEn || "",
        descriptionAr: editingDiscount.descriptionAr || "",
        discountType: editingDiscount.discountType || "percentage",
        value: editingDiscount.value ?? "",
        maxUses: editingDiscount.maxUses ?? "",
        validFrom: editingDiscount.validFrom
          ? new Date(editingDiscount.validFrom).toISOString().slice(0, 10)
          : "",
        validUntil: editingDiscount.validUntil
          ? new Date(editingDiscount.validUntil).toISOString().slice(0, 10)
          : "",
        isActive: editingDiscount.isActive ?? true,
        applicablePlanTypes: editingDiscount.applicablePlanTypes || [],
        minimumAmount: editingDiscount.minimumAmount ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editingDiscount, isOpen]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["discounts"] });

  const createMutation = useMutation({
    mutationFn: (data) => discountsAPI.create(data),
    onSuccess: () => {
      toast.success(t("discounts.createSuccess", "تم إنشاء الكود"));
      invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => discountsAPI.update(id, data),
    onSuccess: () => {
      toast.success(t("discounts.updateSuccess", "تم تحديث الكود"));
      invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Error");
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlanType = (type) =>
    setForm((prev) => ({
      ...prev,
      applicablePlanTypes: prev.applicablePlanTypes.includes(type)
        ? prev.applicablePlanTypes.filter((t) => t !== type)
        : [...prev.applicablePlanTypes, type],
    }));

  const validate = () => {
    const e = {};
    if (!form.code.trim())
      e.code = t("discounts.validation.codeRequired", "الكود مطلوب");
    if (form.value === "" || form.value === null)
      e.value = t("discounts.validation.valueRequired", "القيمة مطلوبة");
    if (parseFloat(form.value) < 0)
      e.value = t("discounts.validation.valuePositive", "القيمة يجب أن تكون موجبة");
    if (form.discountType === "percentage" && parseFloat(form.value) > 100)
      e.value = t("discounts.validation.maxPercent", "النسبة لا تتجاوز 100%");
    if (
      form.validFrom &&
      form.validUntil &&
      new Date(form.validFrom) >= new Date(form.validUntil)
    )
      e.validUntil = t(
        "discounts.validation.dateRange",
        "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء"
      );
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    const payload = {
      ...form,
      value: parseFloat(form.value),
      maxUses: form.maxUses !== "" ? parseInt(form.maxUses) : 0,
      minimumAmount: form.minimumAmount !== "" ? parseFloat(form.minimumAmount) : 0,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
    };
    if (editingDiscount) {
      updateMutation.mutate({ id: editingDiscount.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose} size="auto">
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {editingDiscount
            ? t("discounts.editTitle", "تعديل كود الخصم")
            : t("discounts.createTitle", "إنشاء كود خصم جديد")}
        </h2>

        <div className={styles.grid}>
          {/* Code */}
          <div className={styles.fieldFull}>
            <label className={styles.label}>
              {t("discounts.fields.code", "كود الخصم *")}
            </label>
            <input
              className={`${styles.input} ${errors.code ? styles.inputError : ""}`}
              type="text"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20"
              disabled={!!editingDiscount}
            />
            {errors.code && <span className={styles.error}>{errors.code}</span>}
          </div>

          {/* Description EN */}
          <div className={styles.field}>
            <label className={styles.label}>
              {t("discounts.fields.descEn", "الوصف (إنجليزي)")}
            </label>
            <input
              className={styles.input}
              type="text"
              value={form.descriptionEn}
              onChange={(e) => set("descriptionEn", e.target.value)}
              placeholder="e.g. 20% off for new users"
            />
          </div>

          {/* Description AR */}
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
              placeholder="مثال: خصم 20% للمستخدمين الجدد"
            />
          </div>

          {/* Discount Type */}
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

          {/* Value */}
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

          {/* Max Uses */}
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

          {/* Minimum Amount */}
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

          {/* Valid From */}
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

          {/* Valid Until */}
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

          {/* Status */}
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

          {/* Applicable Plan Types */}
          <div className={styles.fieldFull}>
            <label className={styles.label}>
              {t("discounts.fields.planTypes", "الباقات المطبقة (فارغ = جميع الباقات)")}
            </label>
            <div className={styles.chips}>
              {PLAN_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.chip} ${
                    form.applicablePlanTypes.includes(opt.value)
                      ? styles.chipActive
                      : ""
                  }`}
                  onClick={() => togglePlanType(opt.value)}
                >
                  {isAr ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            {t("discounts.cancel", "إلغاء")}
          </button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
            {saving
              ? t("discounts.saving", "جاري الحفظ...")
              : editingDiscount
              ? t("discounts.saveChanges", "حفظ التعديلات")
              : t("discounts.create", "إنشاء الكود")}
          </button>
        </div>
      </div>
    </PopupLayout>
  );
}
