import React from "react";
import { View, StyleSheet } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../../localization";
import {
  colors,
  spacing,
  typography,
} from "../../../../styles/tokens";
import { PLAN_TYPES } from "../discountsFormUtils";
import { TextInput, DropdownInput, ToggleInput } from "../../../../components/commen";
import DatePicker from "../../../../components/commen/DatePicker";
import CheckboxGroup from "../../../../components/commen/CheckboxGroup";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { CONTENT_DIRECTIONS } from "../../../../hooks/useInputDirection";

const DiscountFormFields = ({ isEdit }) => {
  const { t } = useTranslation("admin");
  const { watch } = useFormContext();
  const discountType = watch("discountType");
  const validFrom = watch("validFrom");

  const discountTypeOptions = [
    { value: "percentage", label: t("discounts.form.percentage") },
    { value: "fixed", label: t("discounts.form.fixed") },
  ];

  const planTypeOptions = PLAN_TYPES.map((value) => ({
    value,
    label: t(`discounts.planTypes.${value}`, value),
  }));

  return (
    <>
      {/* Voucher codes are canonical LTR tokens (blueprint §5.3). */}
      <TextInput
        name="code"
        label={t("discounts.form.code")}
        required
        placeholder={t("discounts.form.codePlaceholder")}
        autoCapitalize="characters"
        contentDirection={CONTENT_DIRECTIONS.LTR}
        editable={!isEdit}
        disabled={isEdit}
      />

      <DropdownInput
        name="discountType"
        label={t("discounts.form.discountType")}
        required
        placeholder={t("discounts.form.discountType")}
        options={discountTypeOptions}
      />

      {/* Numeric amount: stable LTR digits, localized label/error chrome. */}
      <TextInput
        name="value"
        label={
          discountType === "percentage"
            ? t("discounts.form.percent")
            : t("discounts.form.amount")
        }
        required
        placeholder={t("discounts.form.valuePlaceholder")}
        keyboardType="decimal-pad"
        contentDirection={CONTENT_DIRECTIONS.LTR}
      />

      <TextInput
        name="maxUses"
        label={t("discounts.form.maxUses")}
        placeholder={t("discounts.form.maxUsesPlaceholder")}
        keyboardType="number-pad"
        contentDirection={CONTENT_DIRECTIONS.LTR}
      />

      <TextInput
        name="minimumAmount"
        label={t("discounts.form.minimumAmount")}
        placeholder={t("discounts.form.minimumAmountPlaceholder")}
        keyboardType="decimal-pad"
        contentDirection={CONTENT_DIRECTIONS.LTR}
      />

      <DatePicker
        name="validFrom"
        label={t("discounts.form.validFrom")}
        placeholder={t("discounts.form.datePlaceholder")}
      />

      <DatePicker
        name="validUntil"
        label={t("discounts.form.validUntil")}
        placeholder={t("discounts.form.datePlaceholder")}
        minimumDate={validFrom}
      />

      <TextInput
        name="descriptionEn"
        label={t("discounts.form.descriptionEn")}
        placeholder={t("discounts.form.descriptionEnPlaceholder")}
        multiline
        numberOfLines={2}
        contentDirection={CONTENT_DIRECTIONS.LTR}
      />

      <TextInput
        name="descriptionAr"
        label={t("discounts.form.descriptionAr")}
        placeholder={t("discounts.form.descriptionArPlaceholder")}
        multiline
        numberOfLines={2}
        contentDirection={CONTENT_DIRECTIONS.RTL}
      />

      <View style={styles.field}>
        <LocalizedText role="label" style={styles.label}>
          {t("discounts.form.planTypes")}
        </LocalizedText>
        <CheckboxGroup
          name="applicablePlanTypes"
          items={planTypeOptions}
          columns={2}
        />
      </View>

      <ToggleInput
        name="isActive"
        label={t("discounts.form.isActive")}
      />
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing[16],
  },
  label: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[600],
    marginBottom: spacing[6],
  },
});

export default DiscountFormFields;
