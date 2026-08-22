import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "../../localization";
import { useAvailableAddons } from "../../hooks";
import { isolateLtr } from "@halaa/shared/utils/bidi";
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
const AddonsSection = ({ onAddonsChange, showBusiness = false }) => {
  const { t } = useTranslation("plans");
  const { data: catalogResponse, isLoading, error } = useAvailableAddons();
  const catalog = catalogResponse?.data || null;

  const tiers = useMemo(
    () => ({
      extraInvites: catalog?.extra_invites || [],
      designTemplate: catalog?.design_template || [],
      businessCustomization: catalog?.business_customization || null,
    }),
    [catalog]
  );
  const bizPrice = tiers.businessCustomization?.price || 0;

  // Extra-invite tiers stack: the user can pick MULTIPLE tiers that add up.
  // We track the selected tiers by their (unique) `quantity` so each one
  // becomes its own `extra_invites` line item at checkout. Design template
  // and business customization stay single-select (toggle).
  const [extraInvites, setExtraInvites] = useState([]);
  const [designTemplate, setDesignTemplate] = useState(null);
  const [businessCustom, setBusinessCustom] = useState(false);

  const invitesSubtotal = extraInvites.reduce(
    (acc, tier) => acc + (tier.price || 0),
    0
  );

  const selectedCount =
    extraInvites.length + (designTemplate ? 1 : 0) + (businessCustom ? 1 : 0);
  const total =
    invitesSubtotal + (designTemplate?.price || 0) + (businessCustom ? bizPrice : 0);

  const notify = (invList, des, biz) => {
    const items = invList.map((tier) => ({
      addonType: "extra_invites",
      type: "extra_invites",
      quantity: tier.quantity,
      price: tier.price,
    }));
    if (des) {
      items.push({
        addonType: "design_template",
        type: "design_template",
        templateType: des.type,
        quantity: 1,
        price: des.price,
      });
    }
    if (biz) {
      items.push({
        addonType: "business_customization",
        type: "business_customization",
        quantity: 1,
        price: bizPrice,
      });
    }
    const sum =
      invList.reduce((acc, tier) => acc + (tier.price || 0), 0) +
      (des?.price || 0) +
      (biz ? bizPrice : 0);
    onAddonsChange?.(items, sum);
  };

  const toggleInv = (tier) => {
    const isSelected = extraInvites.some((t) => t.quantity === tier.quantity);
    const next = isSelected
      ? extraInvites.filter((t) => t.quantity !== tier.quantity)
      : [...extraInvites, tier];
    setExtraInvites(next);
    notify(next, designTemplate, businessCustom);
  };
  const toggleDes = (tier) => {
    const next = designTemplate?.type === tier.type ? null : tier;
    setDesignTemplate(next);
    notify(extraInvites, next, businessCustom);
  };
  const toggleBiz = () => {
    const next = !businessCustom;
    setBusinessCustom(next);
    notify(extraInvites, designTemplate, next);
  };

  const clearAll = () => {
    setExtraInvites([]);
    setDesignTemplate(null);
    setBusinessCustom(false);
    onAddonsChange?.([], 0);
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader t={t} />
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      </View>
    );
  }

  if (error || !catalog) {
    return (
      <View style={styles.section}>
        <SectionHeader t={t} />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>
            {t("addons.loadFailed", { defaultValue: "Could not load add-ons." })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader t={t} />

      <AddonCard
        icon="paper-plane-outline"
        iconBgGradient={[colors.primary[100], colors.primary[200]]}
        iconColor={colors.primary[700]}
        title={t("addons.extraInvites.title")}
        description={t("addons.extraInvites.description")}
        isActive={extraInvites.length > 0}
        activePrice={extraInvites.length > 0 ? invitesSubtotal : null}
        t={t}
      >
        <View style={styles.tierRow}>
          {tiers.extraInvites.map((tier) => (
            <TierTile
              key={tier.quantity}
              active={extraInvites.some((s) => s.quantity === tier.quantity)}
              onPress={() => toggleInv(tier)}
              quantity={tier.quantity}
              price={tier.price}
              t={t}
            />
          ))}
        </View>
        <View style={styles.hintRow}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colors.primary[600]}
          />
          <Text style={styles.hintText}>{t("addons.extraInvites.stackHint")}</Text>
        </View>
      </AddonCard>

      <AddonCard
        icon="color-palette-outline"
        iconBgGradient={[colors.accent[100], colors.primary[200]]}
        iconColor={colors.secondary[700]}
        title={t("addons.designTemplate.title")}
        description={t("addons.designTemplate.description")}
        isActive={!!designTemplate}
        activePrice={designTemplate?.price}
        t={t}
      >
        <View style={styles.designList}>
          {tiers.designTemplate.map((tier) => {
            const active = designTemplate?.type === tier.type;
            return (
              <TouchableOpacity
                key={tier.type}
                style={[styles.designRow, active && styles.designRowActive]}
                onPress={() => toggleDes(tier)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.designRadio,
                    active && styles.designRadioActive,
                  ]}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={12} color={colors.natural[50]} />
                  ) : null}
                </View>
                <Text
                  style={[styles.designName, active && styles.designNameActive]}
                  numberOfLines={2}
                >
                  {t(`addons.designTypes.${tier.type}`)}
                </Text>
                <Text style={styles.designPrice}>
                  {isolateLtr(`${tier.price} ${t("common.currency.sar")}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AddonCard>

      {showBusiness && tiers.businessCustomization ? (
        <AddonCard
          icon="briefcase-outline"
          iconBgGradient={[colors.accent[100], colors.primary[200]]}
          iconColor={colors.secondary[700]}
          title={t("addons.businessCustomization.title", {
            defaultValue: "Business branding",
          })}
          description={t("addons.businessCustomization.description", {
            defaultValue:
              tiers.businessCustomization.descriptionEn ||
              "Custom webpage + official WhatsApp templates",
          })}
          isActive={businessCustom}
          activePrice={businessCustom ? bizPrice : null}
          t={t}
        >
          <TouchableOpacity
            style={[styles.designRow, businessCustom && styles.designRowActive]}
            onPress={toggleBiz}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.designRadio,
                businessCustom && styles.designRadioActive,
              ]}
            >
              {businessCustom ? (
                <Ionicons name="checkmark" size={12} color={colors.natural[50]} />
              ) : null}
            </View>
            <Text
              style={[
                styles.designName,
                businessCustom && styles.designNameActive,
              ]}
              numberOfLines={2}
            >
              {tiers.businessCustomization.nameEn ||
                t("addons.businessCustomization.title", {
                  defaultValue: "Business branding",
                })}
            </Text>
            <Text style={styles.designPrice}>
              {isolateLtr(`${bizPrice} ${t("common.currency.sar")}`)}
            </Text>
          </TouchableOpacity>
        </AddonCard>
      ) : null}

      <SummaryBar
        t={t}
        selectedCount={selectedCount}
        total={total}
        onClear={clearAll}
      />
    </View>
  );
};

const SectionHeader = ({ t }) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionHeadText}>
      <Text style={styles.sectionTitle}>{t("addons.title")}</Text>
      <Text style={styles.sectionSubtitle}>{t("addons.subtitle")}</Text>
    </View>
  </View>
);

// Selected count + running total, shown at the bottom of the section (just
// above the screen's continue button) so the user sees the tally where they act.
const SummaryBar = ({ t, selectedCount, total, onClear }) =>
  selectedCount > 0 ? (
    <View style={styles.summaryBar}>
      <LinearGradient
        colors={[colors.primary[100], colors.primary[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryChip}
      >
        <Text style={styles.summaryCount}>
          {t("addons.selectedCount", {
            count: selectedCount,
            defaultValue: `${selectedCount} selected`,
          })}
        </Text>
        <View style={styles.summaryDivider} />
        <Text style={styles.summaryTotal}>
          {isolateLtr(`${total} ${t("common.currency.sar")}`)}
        </Text>
        {onClear ? (
          <TouchableOpacity
            onPress={onClear}
            style={styles.summaryClear}
            accessibilityLabel={t("addons.clearAll", { defaultValue: "Clear all" })}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={12} color={colors.secondary[700]} />
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </View>
  ) : null;

const AddonCard = ({
  icon,
  iconBgGradient,
  iconColor,
  title,
  description,
  isActive,
  activePrice,
  children,
  t,
}) => (
  <View style={[styles.card, isActive && styles.cardActive]}>
    <View style={styles.cardHead}>
      <LinearGradient
        colors={iconBgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBadge}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </LinearGradient>
      <View style={styles.cardHeadText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      {isActive && activePrice != null ? (
        <LinearGradient
          colors={[colors.primary[500], colors.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectedChip}
        >
          <Ionicons
            name="checkmark"
            size={12}
            color={colors.natural[50]}
            style={styles.selectedChipIcon}
          />
          <Text style={styles.selectedChipText}>
            {isolateLtr(`${activePrice} ${t("common.currency.sar")}`)}
          </Text>
        </LinearGradient>
      ) : null}
    </View>
    {children}
  </View>
);

const TierTile = ({ active, onPress, quantity, price, t }) => {
  if (active) {
    return (
      <TouchableOpacity
        style={styles.tileWrap}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[colors.primary[100], colors.primary[50]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.tile, styles.tileActive]}
        >
          <Text style={[styles.tileQty, styles.tileQtyActive]}>{isolateLtr(`+${quantity}`)}</Text>
          <Text style={[styles.tilePrice, styles.tilePriceActive]}>
            {isolateLtr(`${price} ${t("common.currency.sar")}`)}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.tileWrap, styles.tile]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.tileQty}>{isolateLtr(`+${quantity}`)}</Text>
      <Text style={styles.tilePrice}>
        {isolateLtr(`${price} ${t("common.currency.sar")}`)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: spacing[16],
    gap: spacing[12],
  },

  // Section header
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    flexWrap: "wrap",
  },
  sectionHeadText: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    lineHeight: 24,
    color: colors.secondary[700],
  },
  sectionSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    lineHeight: 18,
    color: colors.natural[400],
  },

  // Selected-count + total tally, pinned to the bottom of the section
  // (just above the screen's continue button).
  summaryBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing[12],
    marginTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },

  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingStart: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.primary[200],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryCount: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.caption.large,
    lineHeight: 18,
    color: colors.secondary[700],
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.primary[300],
  },
  summaryTotal: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    lineHeight: 20,
    color: colors.primary[700],
  },
  summaryTotalUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    opacity: 0.75,
  },
  summaryClear: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    backgroundColor: colors.natural[50],
    alignItems: "center",
    justifyContent: "center",
  },

  // Card
  card: {
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: borderRadius[20],
    padding: spacing[16],
    gap: spacing[12],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardActive: {
    borderColor: colors.primary[400],
    shadowColor: colors.primary[500],
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: borderRadius[12],
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    lineHeight: 22,
    color: colors.secondary[700],
  },
  cardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
    lineHeight: 18,
  },

  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    gap: 4,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedChipIcon: {
    marginEnd: 2,
  },
  selectedChipText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.caption.large,
    lineHeight: 18,
    color: colors.natural[50],
  },
  selectedChipUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    opacity: 0.85,
  },

  // Tier tiles
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[4],
    marginTop: spacing[4],
  },
  hintText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.large,
    color: colors.natural[450],
    lineHeight: 18,
  },
  tileWrap: {
    flexBasis: "22%",
    flexGrow: 1,
    minWidth: 78,
    borderRadius: borderRadius[12],
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[4],
    borderWidth: 2,
    borderColor: colors.primary[100],
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
    gap: 2,
  },
  tileActive: {
    borderColor: colors.primary[500],
    backgroundColor: "transparent",
  },
  tileQty: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.primary[600],
    lineHeight: 22,
  },
  tileQtyActive: {
    color: colors.primary[700],
  },
  tilePrice: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.large,
    lineHeight: 18,
    color: colors.accent[500],
  },
  tilePriceActive: {
    color: colors.primary[700],
  },
  tilePriceUnit: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.small,
    opacity: 0.75,
  },

  // Design list
  designList: {
    gap: spacing[8],
  },
  designRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    borderWidth: 2,
    borderColor: colors.primary[100],
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
  },
  designRowActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  designRadio: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: colors.primary[300],
    backgroundColor: colors.natural[50],
    alignItems: "center",
    justifyContent: "center",
  },
  designRadioActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[600],
  },
  designName: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    lineHeight: 18,
    color: colors.secondary[700],
  },
  designNameActive: {
    color: colors.primary[700],
  },
  designPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    lineHeight: 20,
    color: colors.primary[600],
  },
  designPriceUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    opacity: 0.75,
  },

  // Loading / error states
  loadingCard: {
    height: 120,
    borderRadius: borderRadius[20],
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  errorState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    padding: spacing[12],
    borderRadius: borderRadius[12],
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: "#7C2222",
  },
});

export default AddonsSection;
