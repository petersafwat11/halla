import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";
import { getLocalized } from "../../../utils/locale";

/**
 * Renders the "Included Features" grid for a plan card.
 *
 * Accepts `plan.featuresArray` — a pre-built array of `{ icon, labelAr, labelEn }`
 * objects from the backend's `FEATURE_LABELS` constant. Labels are resolved
 * via `getLocalized()` so they stay consistent across all screens.
 */
const PlanFeatureRow = ({ features }) => {
  const { t, i18n } = useTranslation("plans");
  const locale = i18n.language;

  const rendered = useMemo(() => {
    if (!features || !Array.isArray(features)) return [];
    return features.map((f, i) => ({
      icon: f.icon,
      label: getLocalized(f, "label", locale),
      key: `feat-${i}`,
    }));
  }, [features, locale]);

  if (rendered.length === 0) return null;

  return (
    <View style={styles.featuresWrap}>
      <Text style={styles.featuresTitle}>{t("features.title")}</Text>
      <View style={styles.featuresGrid}>
        {rendered.map((f) => (
          <View key={f.key} style={styles.featureItem}>
            <Ionicons name={f.icon} size={14} color={colors.success[500]} />
            <Text style={styles.featureText} numberOfLines={2}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  featuresWrap: {
    marginBottom: spacing[16],
  },
  featuresTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    marginBottom: spacing[8],
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  featureItem: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[8],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[8],
  },
  featureText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.large,
    color: colors.secondary[600],
  },
});

export default PlanFeatureRow;
