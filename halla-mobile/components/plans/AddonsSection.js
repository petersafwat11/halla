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

  const selectedCount =
    (extraInvites ? 1 : 0) +
    (extraReminders ? 1 : 0) +
    (designTemplate ? 1 : 0);
  const total =
    (extraInvites?.price || 0) +
    (extraReminders?.price || 0) +
    (designTemplate?.price || 0);

  const notify = (inv, rem, des) => {
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
    const sum = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    onAddonsChange?.(items, sum);
  };

  const toggleInv = (tier) => {
    const next = extraInvites?.quantity === tier.quantity ? null : tier;
    setExtraInvites(next);
    notify(next, extraReminders, designTemplate);
  };
  const toggleRem = (tier) => {
    const next = extraReminders?.quantity === tier.quantity ? null : tier;
    setExtraReminders(next);
    notify(extraInvites, next, designTemplate);
  };
  const toggleDes = (tier) => {
    const next = designTemplate?.type === tier.type ? null : tier;
    setDesignTemplate(next);
    notify(extraInvites, extraReminders, next);
  };

  const clearAll = () => {
    setExtraInvites(null);
    setExtraReminders(null);
    setDesignTemplate(null);
    onAddonsChange?.([], 0);
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader t={t} selectedCount={0} total={0} />
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      </View>
    );
  }

  if (error || !catalog) {
    return (
      <View style={styles.section}>
        <SectionHeader t={t} selectedCount={0} total={0} />
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
      <SectionHeader
        t={t}
        selectedCount={selectedCount}
        total={total}
        onClear={clearAll}
      />

      <AddonCard
        icon="paper-plane-outline"
        iconBgGradient={[colors.primary[100], colors.primary[200]]}
        iconColor={colors.primary[700]}
        title={t("addons.extraInvites.title")}
        description={t("addons.extraInvites.description")}
        isActive={!!extraInvites}
        activePrice={extraInvites?.price}
        t={t}
      >
        <View style={styles.tierRow}>
          {tiers.extraInvites.map((tier) => (
            <TierTile
              key={tier.quantity}
              active={extraInvites?.quantity === tier.quantity}
              onPress={() => toggleInv(tier)}
              quantity={tier.quantity}
              price={tier.price}
              t={t}
            />
          ))}
        </View>
      </AddonCard>

      <AddonCard
        icon="notifications-outline"
        iconBgGradient={[colors.primary[50], colors.primary[300]]}
        iconColor={colors.primary[800]}
        title={t("addons.extraReminders.title")}
        description={t("addons.extraReminders.description")}
        isActive={!!extraReminders}
        activePrice={extraReminders?.price}
        t={t}
      >
        <View style={styles.tierRow}>
          {tiers.extraReminders.map((tier) => (
            <TierTile
              key={tier.quantity}
              active={extraReminders?.quantity === tier.quantity}
              onPress={() => toggleRem(tier)}
              quantity={tier.quantity}
              price={tier.price}
              t={t}
            />
          ))}
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
                  {tier.price}
                  <Text style={styles.designPriceUnit}>
                    {" "}
                    {t("common.currency.sar")}
                  </Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AddonCard>
    </View>
  );
};

const SectionHeader = ({ t, selectedCount, total, onClear }) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionHeadText}>
      <Text style={styles.sectionTitle}>{t("addons.title")}</Text>
      <Text style={styles.sectionSubtitle}>{t("addons.subtitle")}</Text>
    </View>
    {selectedCount > 0 ? (
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
          {total}
          <Text style={styles.summaryTotalUnit}>
            {" "}
            {t("common.currency.sar")}
          </Text>
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
    ) : null}
  </View>
);

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
            {activePrice}
            <Text style={styles.selectedChipUnit}>
              {" "}
              {t("common.currency.sar")}
            </Text>
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
          <Text style={[styles.tileQty, styles.tileQtyActive]}>+{quantity}</Text>
          <Text style={[styles.tilePrice, styles.tilePriceActive]}>
            {price}
            <Text style={styles.tilePriceUnit}>
              {" "}
              {t("common.currency.sar")}
            </Text>
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
      <Text style={styles.tileQty}>+{quantity}</Text>
      <Text style={styles.tilePrice}>
        {price}
        <Text style={styles.tilePriceUnit}> {t("common.currency.sar")}</Text>
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
    color: colors.secondary[700],
  },
  sectionSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },

  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingLeft: 14,
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
    color: colors.secondary[700],
  },
  designNameActive: {
    color: colors.primary[700],
  },
  designPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
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
