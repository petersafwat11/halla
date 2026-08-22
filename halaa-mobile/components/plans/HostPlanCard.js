import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { getLocalized } from "@halaa/shared/utils/locale";
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
  const planName = matchedPlan
    ? getLocalized(matchedPlan, "name", lang) || matchedPlan.name
    : null;

  return (
    <View style={[styles.card, isPopular && styles.cardPopular]}>
      {isPopular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>
            {t("popular", { defaultValue: "" })}
          </Text>
        </View>
      ) : null}

      <PlanPriceBlock
        planFamily={planFamily}
        price={price}
        planName={planName}
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
        showTagline={false}
        showDuration={false}
        inlineExtras
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
    padding: spacing[20],
    marginBottom: spacing[16],
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPopular: {
    shadowColor: colors.primary[500],
    shadowOpacity: 0.18,
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
  subscribeBtn: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    marginTop: spacing[8],
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
