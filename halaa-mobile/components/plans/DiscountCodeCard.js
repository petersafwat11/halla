import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

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

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name="pricetag-outline"
          size={16}
          color={colors.primary[500]}
        />
        <Text style={styles.cardTitle}>{t("summary.discount.title")}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.discountInputWrapper}>
          <TextInput
            style={[
              styles.discountInput,
              applied && styles.discountInputApplied,
              !!errorMessage && !applied && styles.discountInputError,
            ]}
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
          <Text style={styles.discountSuccess}>
            {t("summary.discount.success", {
              code: appliedCode,
              amount: typeof amount === "number" ? amount.toFixed(2).replace(/\.00$/, "") : amount,
            })}
          </Text>
        ) : null}

        {errorMessage && !applied ? (
          <Text style={styles.discountErrorMsg}>{errorMessage}</Text>
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
