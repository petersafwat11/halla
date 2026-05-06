import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../stores/authStore";
import { addons as addonsAPI } from "../../services/adminDashboardService";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

const EXTRA_INVITES_TIERS = [
  { quantity: 10, price: 40 },
  { quantity: 20, price: 75 },
  { quantity: 30, price: 105 },
  { quantity: 40, price: 130 },
  { quantity: 50, price: 150 },
];

const EXTRA_REMINDERS_TIERS = [
  { quantity: 1, price: 25 },
  { quantity: 2, price: 45 },
  { quantity: 3, price: 60 },
  { quantity: 4, price: 70 },
  { quantity: 5, price: 75 },
];

const DESIGN_TEMPLATE_TIERS = [
  { type: "ready_made", price: 200 },
  { type: "custom_male", price: 200 },
  { type: "custom_themed", price: 275 },
  { type: "animated", price: 350 },
  { type: "3d", price: 500 },
];

const generateIdempotencyKey = (addonType) => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `addon-${addonType}-${crypto.randomUUID()}`;
  }
  return `addon-${addonType}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const AddonsSection = ({ onAddonsChange, eventId = null, scope = "pool" }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";
  const toast = useToast();
  const token = useAuthStore((state) => state.token);

  const [extraInvites, setExtraInvites] = useState(null);
  const [extraReminders, setExtraReminders] = useState(null);
  const [designTemplate, setDesignTemplate] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  const notify = (inv, rem, des) => {
    const total = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    const items = [];
    if (inv) items.push({ type: "extra_invites", quantity: inv.quantity, price: inv.price });
    if (rem) items.push({ type: "extra_reminders", quantity: rem.quantity, price: rem.price });
    if (des) items.push({ type: "design_template", templateType: des.type, quantity: 1, price: des.price });
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

  const purchaseSelected = async () => {
    const selections = [];
    if (extraInvites) {
      selections.push({
        addonType: "extra_invites",
        quantity: extraInvites.quantity,
        scope,
        eventId: scope === "event" ? eventId : undefined,
      });
    }
    if (extraReminders) {
      selections.push({
        addonType: "extra_reminders",
        quantity: extraReminders.quantity,
        scope: "org",
      });
    }
    if (designTemplate) {
      selections.push({
        addonType: "design_template",
        templateType: designTemplate.type,
        quantity: 1,
        scope: "org",
      });
    }
    if (selections.length === 0) {
      toast.info(t("addons.purchase.noneSelected"));
      return;
    }

    setPurchasing(true);
    const errors = [];
    let succeeded = 0;
    for (const sel of selections) {
      try {
        await addonsAPI.purchase(token, sel, generateIdempotencyKey(sel.addonType));
        succeeded += 1;
      } catch (err) {
        errors.push({
          addonType: sel.addonType,
          message: err?.message || t("addons.purchase.error"),
        });
      }
    }
    setPurchasing(false);

    if (succeeded > 0) {
      toast.success(t("addons.purchase.success"));
      setExtraInvites(null);
      setExtraReminders(null);
      setDesignTemplate(null);
      notify(null, null, null);
    }
    for (const e of errors) {
      toast.error(`${e.addonType}: ${e.message}`);
    }
  };

  const hasSelection = !!(extraInvites || extraReminders || designTemplate);
  const totalPrice =
    (extraInvites?.price || 0) +
    (extraReminders?.price || 0) +
    (designTemplate?.price || 0);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>{t("addons.title")}</Text>
        <Text style={styles.subtitle}>{t("addons.subtitle")}</Text>
      </View>

      {/* Extra Invites */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.extraInvites.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.extraInvites.description")}
          </Text>
        </View>
        <View style={styles.tierRow}>
          {EXTRA_INVITES_TIERS.map((tier) => {
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
                  {tier.price} {isArabic ? "ر.س" : "SAR"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Extra Reminders */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.extraReminders.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.extraReminders.description")}
          </Text>
        </View>
        <View style={styles.tierRow}>
          {EXTRA_REMINDERS_TIERS.map((tier) => {
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
                  {tier.price} {isArabic ? "ر.س" : "SAR"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Purchase summary */}
      {hasSelection ? (
        <View style={styles.purchaseRow}>
          <Text style={styles.purchaseTotal}>
            {t("addons.purchase.total")}: {totalPrice}{" "}
            {isArabic ? "ر.س" : "SAR"}
          </Text>
          <TouchableOpacity
            style={[styles.purchaseBtn, purchasing && styles.purchaseBtnDisabled]}
            onPress={purchaseSelected}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <Text style={styles.purchaseBtnText}>
              {purchasing
                ? t("addons.purchase.processing")
                : t("addons.purchase.cta")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Design Template */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{t("addons.designTemplate.title")}</Text>
          <Text style={styles.cardDesc}>
            {t("addons.designTemplate.description")}
          </Text>
        </View>
        <View style={styles.templateList}>
          {DESIGN_TEMPLATE_TIERS.map((tier) => {
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
                  <Text
                    style={[styles.tierPrice, active && styles.tierPriceActive]}
                  >
                    {tier.price} {isArabic ? "ر.س" : "SAR"}
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
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    padding: spacing[12],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[50],
  },
  purchaseTotal: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
    flexShrink: 1,
  },
  purchaseBtn: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
  },
  purchaseBtnDisabled: {
    opacity: 0.6,
  },
  purchaseBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
});

export default AddonsSection;
