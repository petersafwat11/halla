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
  discountApplied,
  validating,
  onCodeChange,
  onApply,
  t,
}) => {
  const disabled = discountApplied || !discountCode.trim() || validating;

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
              discountApplied && styles.discountInputApplied,
            ]}
            placeholder={t("summary.discount.placeholder")}
            placeholderTextColor={colors.natural[350]}
            value={discountCode}
            onChangeText={onCodeChange}
            autoCapitalize="characters"
            editable={!discountApplied}
          />
          <TouchableOpacity
            style={[styles.applyButton, disabled && styles.applyButtonDisabled]}
            onPress={onApply}
            disabled={disabled}
            activeOpacity={0.85}
          >
            {validating ? (
              <ActivityIndicator size="small" color={colors.natural[50]} />
            ) : discountApplied ? (
              <>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.natural[50]}
                />
                <Text style={styles.applyButtonText}>
                  {t("summary.discount.applied")}
                </Text>
              </>
            ) : (
              <Text style={styles.applyButtonText}>
                {t("summary.discount.apply")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  applyButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
});

export default DiscountCodeCard;
