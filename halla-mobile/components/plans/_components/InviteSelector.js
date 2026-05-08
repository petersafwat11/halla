import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const InviteSelector = ({ plans, billingType, selectedInvites, onInviteChange }) => {
  const { t } = useTranslation("plans");

  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorLabel}>
        {billingType === "monthly"
          ? t("inviteSelector.poolLabel")
          : t("inviteSelector.label")}
      </Text>
      <View style={styles.guestTrack}>
        {plans.map((plan) => {
          const value = getInviteValue(plan, billingType);
          const active = selectedInvites === value;
          return (
            <TouchableOpacity
              key={plan.code}
              style={[styles.guestBtn, active && styles.guestBtnActive]}
              onPress={() => onInviteChange?.(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.guestNum, active && styles.guestNumActive]}>
                {value}
              </Text>
              <Text style={[styles.guestUnit, active && styles.guestUnitActive]}>
                {t("inviteSelector.invites")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export { getInviteValue };

const styles = StyleSheet.create({
  selectorWrap: {
    marginBottom: spacing[16],
  },
  selectorLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[600],
    textAlign: "center",
    marginBottom: spacing[8],
  },
  guestTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  guestBtn: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 72,
    alignItems: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 2,
    borderColor: colors.primary[200],
    backgroundColor: colors.natural[50],
  },
  guestBtnActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[100],
  },
  guestNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.primary[500],
    lineHeight: 20,
  },
  guestNumActive: {
    color: colors.primary[700],
  },
  guestUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    color: colors.accent[500],
  },
  guestUnitActive: {
    color: colors.primary[700],
  },
});

export default InviteSelector;
