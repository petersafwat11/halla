import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useAvailableAddons } from "../../hooks";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

/**
 * Addon picker. Selections are bubbled up via `onAddonsChange` and the actual
 * purchase happens in PlansSummaryScreen → useCheckout (single bundled
 * Moyasar charge for plan + addons − discount). This component never calls
 * the addons-purchase endpoint directly.
 */
const AddonsSection = ({ onAddonsChange }) => {
  const { t } = useTranslation("plans");
  const { data: catalogResponse, isLoading, error } = useAvailableAddons();
  const catalog = catalogResponse?.data || null;

  const tiers = useMemo(
    () => ({
      extraInvites: catalog?.extra_invites || [],
      extraReminders: catalog?.extra_reminders || [],
      designTemplate: catalog?.design_template || [],
    }),
    [catalog]
  );

  const [extraInvites, setExtraInvites] = useState(null);
  const [extraReminders, setExtraReminders] = useState(null);
  const [designTemplate, setDesignTemplate] = useState(null);

  const notify = (inv, rem, des) => {
    const total = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    const items = [];
    if (inv) {
      items.push({
        addonType: "extra_invites",
        type: "extra_invites",
        quantity: inv.quantity,
        price: inv.price,
      });
    }
    if (rem) {
      items.push({
        addonType: "extra_reminders",
        type: "extra_reminders",
        quantity: rem.quantity,
        price: rem.price,
      });
    }
    if (des) {
      items.push({
        addonType: "design_template",
        type: "design_template",
        templateType: des.type,
        quantity: 1,
        price: des.price,
      });
    }
    onAddonsChange?.(items, total);
  };

  const setInv = (tier) => {
    const next = extraInvites?.quantity === tier.quantity ? null : tier;
    setExtraInvites(next);
    notify(next, extraReminders, designTemplate);
  };
  const setRem = (tier) => {
    const next = extraReminders?.quantity === tier.quantity ? null : tier;
    setExtraReminders(next);
    notify(extraInvites, next, designTemplate);
  };
  const setDes = (tier) => {
    const next = designTemplate?.type === tier.type ? null : tier;
    setDesignTemplate(next);
    notify(extraInvites, extraReminders, next);
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.heading}>
          <Text style={styles.title}>{t("addons.title")}</Text>
        </View>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  if (error || !catalog) {
    return (
      <View style={styles.section}>
        <View style={styles.heading}>
          <Text style={styles.title}>{t("addons.title")}</Text>
          <Text style={styles.subtitle}>
            {t("addons.loadFailed", { defaultValue: "Could not load add-ons." })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>{t("addons.title")}</Text>
        <Text style={styles.subtitle}>{t("addons.subtitle")}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.extraInvites.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.extraInvites.description")}
          </Text>
        </View>
        <View style={styles.tierRow}>
          {tiers.extraInvites.map((tier) => {
            const active = extraInvites?.quantity === tier.quantity;
            return (
              <TouchableOpacity
                key={tier.quantity}
                style={[styles.tierBtn, active && styles.tierBtnActive]}
                onPress={() => setInv(tier)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierQty, active && styles.tierQtyActive]}>
                  +{tier.quantity}
                </Text>
                <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>
                  {tier.price} {t("common.currency.sar")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.extraReminders.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.extraReminders.description")}
          </Text>
        </View>
        <View style={styles.tierRow}>
          {tiers.extraReminders.map((tier) => {
            const active = extraReminders?.quantity === tier.quantity;
            return (
              <TouchableOpacity
                key={tier.quantity}
                style={[styles.tierBtn, active && styles.tierBtnActive]}
                onPress={() => setRem(tier)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tierQty, active && styles.tierQtyActive]}>
                  +{tier.quantity}
                </Text>
                <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>
                  {tier.price} {t("common.currency.sar")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.designTemplate.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.designTemplate.description")}
          </Text>
        </View>
        <View style={styles.templateList}>
          {tiers.designTemplate.map((tier) => {
            const active = designTemplate?.type === tier.type;
            return (
              <TouchableOpacity
                key={tier.type}
                style={[styles.templateBtn, active && styles.templateBtnActive]}
                onPress={() => setDes(tier)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.templateName, active && styles.templateNameActive]}
                  numberOfLines={2}
                >
                  {t(`addons.designTypes.${tier.type}`)}
                </Text>
                <View style={styles.templateRight}>
                  <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>
                    {tier.price} {t("common.currency.sar")}
                  </Text>
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary[700]}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: spacing[16],
    gap: spacing[12],
  },
  heading: {
    gap: 4,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[700],
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },
  card: {
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    paddingBottom: spacing[8],
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    gap: 4,
  },
  cardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
  },
  cardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  tierBtn: {
    flexBasis: "18%",
    flexGrow: 1,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
  },
  tierBtnActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[100],
  },
  tierQty: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[500],
  },
  tierQtyActive: {
    color: colors.primary[700],
  },
  tierPrice: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    color: colors.accent[500],
    marginTop: 2,
  },
  tierPriceActive: {
    color: colors.primary[700],
  },
  templateList: {
    gap: spacing[8],
  },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
  },
  templateBtnActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[100],
  },
  templateName: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
  },
  templateNameActive: {
    color: colors.primary[700],
  },
  templateRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

export default AddonsSection;
