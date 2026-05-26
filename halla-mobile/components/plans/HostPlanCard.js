import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";
import PlanPriceBlock from "./_components/PlanPriceBlock";
import InviteSelector, { getInviteValue } from "./_components/InviteSelector";
import PlanDescription from "./PlanDescription";

const HostPlanCard = ({
  planFamily,
  isPopular = false,
  plans = [],
  billingType,
  selectedInvites,
  onInviteChange,
  onSubscribe,
}) => {
  const { t, i18n } = useTranslation("plans");
  const lang = i18n.language || "ar";

  const matchedPlan = useMemo(
    () =>
      plans.find((p) => getInviteValue(p, billingType) === selectedInvites) ||
      plans[0] ||
      null,
    [plans, billingType, selectedInvites]
  );

  const price = matchedPlan?.price || 0;

  return (
    <View style={[styles.card, isPopular && styles.cardPopular]}>
      {isPopular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>
            {t(`planFamilies.${planFamily}`)}
          </Text>
        </View>
      ) : null}

      <PlanPriceBlock
        planFamily={planFamily}
        billingType={billingType}
        price={price}
      />

      <InviteSelector
        plans={plans}
        billingType={billingType}
        selectedInvites={selectedInvites}
        onInviteChange={onInviteChange}
      />

      <PlanDescription
        plan={matchedPlan}
        lang={lang}
        selectedInviteCount={selectedInvites}
      />

      <TouchableOpacity
        style={[styles.subscribeBtn, !matchedPlan && styles.subscribeBtnDisabled]}
        onPress={() => matchedPlan && onSubscribe?.(matchedPlan)}
        disabled={!matchedPlan}
        activeOpacity={0.8}
      >
        <Text style={styles.subscribeBtnText}>{t("buttons.subscribeAction")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[20],
    borderWidth: 2,
    borderColor: colors.primary[200],
    padding: spacing[20],
    marginBottom: spacing[16],
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPopular: {
    borderColor: colors.primary[500],
    shadowOpacity: 0.12,
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    backgroundColor: colors.primary[300],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: 999,
  },
  popularBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  validityNote: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: borderRadius[12],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    marginBottom: spacing[16],
    alignItems: "center",
  },
  validityNoteText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    textAlign: "center",
  },
  compensation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    marginBottom: spacing[12],
  },
  compensationContent: {
    flex: 1,
  },
  compensationTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[600],
  },
  compensationValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[500],
  },
  subscribeBtn: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.natural[50],
  },
});

export default HostPlanCard;
