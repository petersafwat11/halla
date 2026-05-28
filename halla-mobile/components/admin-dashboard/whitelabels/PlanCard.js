import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../styles/tokens";
import SarIcon from "../../commen/SarIcon";

const PlanCard = ({ plan, isSelected, onSelect }) => {
  const { t } = useTranslation("admin");
  const planLabel = plan.nameEn || plan.code;
  const planDesc = plan.nameAr || "";
  const inviteInfo = plan.limits?.invitePool != null
    ? t("whitelabels.subscription.invitesPool", { count: plan.limits.invitePool })
    : plan.limits?.maxInvitesPerEvent != null
    ? t("whitelabels.subscription.invitesPerEvent", { count: plan.limits.maxInvitesPerEvent })
    : "";
  const price = plan.pricing?.oneTime || 0;

  return (
    <TouchableOpacity
      style={[styles.planCard, isSelected && styles.planCardSelected]}
      onPress={() => onSelect(plan.code)}
      activeOpacity={0.75}
    >
      <View style={styles.planCardLeft}>
        <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
          {isSelected && <View style={styles.planRadioDot} />}
        </View>
        <View style={styles.planTextBlock}>
          <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
            {planLabel}
          </Text>
          <View style={styles.planDescRow}>
            <Text style={styles.planDesc}>{price.toLocaleString()}</Text>
            <SarIcon size={20} color={colors.natural[500]} style={{ marginHorizontal: 4 }} />
            {inviteInfo ? <Text style={styles.planDesc}>{`·  ${inviteInfo}`}</Text> : null}
          </View>
          {planDesc ? <Text style={styles.planDescAr}>{planDesc}</Text> : null}
        </View>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[12],
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    backgroundColor: "transparent",
  },
  planCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}08`,
  },
  planCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.natural[300],
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: {
    borderColor: colors.primary[500],
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  planTextBlock: {
    flex: 1,
  },
  planLabel: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  planLabelSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  planDesc: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
    marginTop: 2,
  },
  planDescRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  planDescAr: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginTop: 1,
  },
});

export default PlanCard;
