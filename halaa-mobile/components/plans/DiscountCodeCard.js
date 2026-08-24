import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { formatSar } from "@halaa/shared/utils";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

/**
 * Discount-code card (web/Moyasar checkout only).
 *
 * Field contract: the code is a canonical LTR token (`contentDirection="ltr"`)
 * with a localized label/placeholder/error chrome that follows the UI locale
 * and never flips with the typed value. The applied-success line interpolates
 * the code and amount as isolated tokens inside the translated sentence.
 */
const DiscountCodeCard = ({
  discountCode,
  applied,
  loading,
  amount,
  appliedCode,
  errorMessage,
  onCodeChange,
  onApply,
  onRemove,
  t,
}) => {
  const applyDisabled = !discountCode.trim() || loading;

  const formattedAmount =
    typeof amount === "number"
      ? formatSar(amount, { trimTrailingZeros: true })
      : String(amount ?? "");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name="pricetag-outline"
          size={16}
          color={colors.primary[500]}
        />
        <LocalizedText style={styles.cardTitle}>
          {t("summary.discount.title")}
        </LocalizedText>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.discountInputWrapper}>
          <TextInput
            style={[
              styles.discountInput,
              applied && styles.discountInputApplied,
              !!errorMessage && !applied && styles.discountInputError,
            ]}
            contentDirection="ltr"
            placeholder={t("summary.discount.placeholder")}
            placeholderTextColor={colors.natural[350]}
            value={discountCode}
            onChangeText={onCodeChange}
            autoCapitalize="characters"
            editable={!applied && !loading}
          />
          {applied ? (
            <TouchableOpacity
              style={[styles.applyButton, styles.removeButton]}
              onPress={onRemove}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={16} color={colors.natural[50]} />
              <Text style={styles.applyButtonText}>
                {t("summary.discount.remove")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyButton,
                applyDisabled && styles.applyButtonDisabled,
              ]}
              onPress={onApply}
              disabled={applyDisabled}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.natural[50]} />
              ) : (
                <Text style={styles.applyButtonText}>
                  {t("summary.discount.apply")}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {applied ? (
          <LocalizedText style={styles.discountSuccess}>
            {t("summary.discount.success", {
              // Code + amount are LTR tokens isolated inside the sentence.
              code: isolateLtr(appliedCode),
              amount: isolateLtr(formattedAmount),
            })}
          </LocalizedText>
        ) : null}

        {errorMessage && !applied ? (
          // Backend validation reasons may arrive in either script — follow
          // the content's first strong character, not the UI locale.
          <AdaptiveText style={styles.discountErrorMsg}>
            {errorMessage}
          </AdaptiveText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    marginBottom: spacing[12],
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  cardContent: {
    padding: spacing[16],
  },
  discountInputWrapper: {
    flexDirection: "row",
    gap: spacing[8],
  },
  discountInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.natural[250],
    borderRadius: borderRadius[12],
    paddingHorizontal: spacing[16],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    backgroundColor: colors.natural[50],
  },
  discountInputApplied: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[300],
    color: colors.success[800],
  },
  discountInputError: {
    borderColor: colors.error[400],
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[20],
    borderRadius: borderRadius[12],
    minWidth: 96,
    height: 48,
  },
  applyButtonDisabled: {
    backgroundColor: colors.primary[200],
  },
  removeButton: {
    backgroundColor: colors.error[500],
  },
  applyButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  discountSuccess: {
    marginTop: spacing[8],
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.success[700],
  },
  discountErrorMsg: {
    marginTop: spacing[8],
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.error[600],
  },
});

export default DiscountCodeCard;
