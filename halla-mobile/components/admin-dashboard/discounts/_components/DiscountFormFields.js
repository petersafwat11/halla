import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../../styles/tokens";

const DiscountFormFields = ({ form, isEdit, set, t }) => {
  const setField = (key, value) => set(key, value);

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.code")}</Text>
        <TextInput
          style={[styles.input, isEdit && styles.inputDisabled]}
          value={form.code}
          onChangeText={(v) => setField("code", v.toUpperCase())}
          placeholder={t("discounts.form.codePlaceholder")}
          placeholderTextColor={colors.natural[300]}
          autoCapitalize="characters"
          editable={!isEdit}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.discountType")}</Text>
        <View style={styles.typeRow}>
          {["percentage", "fixed"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, form.discountType === type && styles.typeBtnActive]}
              onPress={() => setField("discountType", type)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.typeBtnText, form.discountType === type && styles.typeBtnTextActive]}
              >
                {t(`discounts.form.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.value")}</Text>
        <TextInput
          style={styles.input}
          value={form.value}
          onChangeText={(v) => setField("value", v)}
          placeholder={t("discounts.form.valuePlaceholder")}
          placeholderTextColor={colors.natural[300]}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.maxUses")}</Text>
        <TextInput
          style={styles.input}
          value={form.maxUses}
          onChangeText={(v) => setField("maxUses", v)}
          placeholder={t("discounts.form.maxUsesPlaceholder")}
          placeholderTextColor={colors.natural[300]}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.minimumAmount")}</Text>
        <TextInput
          style={styles.input}
          value={form.minimumAmount}
          onChangeText={(v) => setField("minimumAmount", v)}
          placeholder={t("discounts.form.minimumAmountPlaceholder")}
          placeholderTextColor={colors.natural[300]}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.validFrom")}</Text>
        <TextInput
          style={styles.input}
          value={form.validFrom}
          onChangeText={(v) => setField("validFrom", v)}
          placeholder={t("discounts.form.datePlaceholder")}
          placeholderTextColor={colors.natural[300]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.validUntil")}</Text>
        <TextInput
          style={styles.input}
          value={form.validUntil}
          onChangeText={(v) => setField("validUntil", v)}
          placeholder={t("discounts.form.datePlaceholder")}
          placeholderTextColor={colors.natural[300]}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.descriptionEn")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.descriptionEn}
          onChangeText={(v) => setField("descriptionEn", v)}
          placeholder={t("discounts.form.descriptionEnPlaceholder")}
          placeholderTextColor={colors.natural[300]}
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("discounts.form.descriptionAr")}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.descriptionAr}
          onChangeText={(v) => setField("descriptionAr", v)}
          placeholder={t("discounts.form.descriptionArPlaceholder")}
          placeholderTextColor={colors.natural[300]}
          multiline
          numberOfLines={2}
          textAlign="right"
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.label}>{t("discounts.form.isActive")}</Text>
        <Switch
          value={form.isActive}
          onValueChange={(v) => setField("isActive", v)}
          trackColor={{ false: colors.natural[200], true: colors.primary[400] }}
          thumbColor={form.isActive ? colors.primary[500] : colors.natural[300]}
        />
      </View>
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
  input: {
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[900],
    backgroundColor: "#FFF",
  },
  inputDisabled: {
    backgroundColor: colors.natural[50],
    color: colors.natural[400],
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing[10],
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing[10],
    borderRadius: borderRadius[8],
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  typeBtnActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  typeBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[600],
  },
  typeBtnTextActive: {
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[16],
  },
});

export default DiscountFormFields;
