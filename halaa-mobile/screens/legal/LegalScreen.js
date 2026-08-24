import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isolateLegalLtrTokens } from "@halaa/shared/legal";
import { useTranslation } from "../../localization";
import LocalizedText from "../../components/commen/LocalizedText";
import { TopBar } from "../../components/plans";
import {
  colors,
  backgrounds,
  spacing,
  borderRadius,
} from "../../styles/tokens";

/**
 * Reusable legal document screen (Privacy / Terms / Community Rules / Refund /
 * Deletion / Support). Receives a localized `data` object of shape:
 *   { badge, title, subtitle, lastUpdated, sections: [{ id, num, label, title, body }] }
 * Body paragraphs are separated by "\n\n".
 *
 * Direction model (blueprint §4.5):
 *  - Layout is logical start-to-end via the inherited root direction; a plain
 *    `flexDirection: "row"` renders section number → title in reading order.
 *  - Every localized string (badge/title/subtitle/date line/section labels/
 *    titles/paragraphs) renders through the shared `LocalizedText` role, so
 *    copy always follows the UI locale regardless of embedded tokens.
 *  - Intrinsically LTR tokens inside Arabic paragraphs AND section headers
 *    (emails, phones, URLs, company/store names, vendor brands, percentages)
 *    are isolated by the canonical shared matcher (`isolateLegalLtrTokens`)
 *    so BiDi cannot scramble them; the matcher is expanded only from proven
 *    content cases (e.g. refund §11 title "App Store و Google Play").
 *  - Section numbers stay pinned LTR digits (intentionally physical glyph).
 */
const LegalScreen = ({ data }) => {
  const { t, currentLanguage } = useTranslation("settings");
  const isRtl = currentLanguage === "ar";

  const sections = Array.isArray(data?.sections) ? data.sections : [];

  // Suppress top badge when normalized badge === title to prevent redundant pill duplication
  const hasDistinctBadge =
    !!data?.badge &&
    String(data.badge).trim().toLowerCase() !== String(data.title || "").trim().toLowerCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={data?.title} showBack={true} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Document heading */}
          <View style={styles.header}>
            {hasDistinctBadge && (
              <View style={styles.badge}>
                <LocalizedText style={styles.badgeText}>
                  {data.badge}
                </LocalizedText>
              </View>
            )}
            {!!data?.title && (
              <LocalizedText
                style={styles.title}
                accessibilityRole="header"
              >
                {data.title}
              </LocalizedText>
            )}
            {!!data?.subtitle && (
              <LocalizedText style={styles.subtitle}>
                {data.subtitle}
              </LocalizedText>
            )}
            {!!data?.lastUpdated && (
              <LocalizedText style={styles.lastUpdated}>
                {t("legal.lastUpdated", { date: data.lastUpdated })}
              </LocalizedText>
            )}
          </View>

          {/* Sections */}
          {sections.map((section) => {
            const paragraphs = String(section.body || "").split("\n\n");
            return (
              <View key={section.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  {/* Section number stays visually stable (LTR digit) while the
                      title/body follow the ambient locale direction. */}
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeText}>{section.num}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    {!!section.label && (
                      <LocalizedText style={styles.sectionLabel}>
                        {isolateLegalLtrTokens(section.label, isRtl)}
                      </LocalizedText>
                    )}
                    {!!section.title && (
                      <LocalizedText
                        style={styles.sectionTitle}
                        accessibilityRole="header"
                      >
                        {isolateLegalLtrTokens(section.title, isRtl)}
                      </LocalizedText>
                    )}
                  </View>
                </View>

                {paragraphs.map((paragraph, index) => (
                  <LocalizedText
                    key={`${section.id}-p${index}`}
                    style={styles.paragraph}
                  >
                    {isolateLegalLtrTokens(paragraph, isRtl)}
                  </LocalizedText>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary[500],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[40],
  },
  header: {
    marginBottom: spacing[20],
    alignItems: "flex-start",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[20],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[12],
    marginBottom: spacing[12],
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: colors.primary[700],
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: colors.natural[900],
    marginBottom: spacing[4],
    alignSelf: "stretch",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: colors.primary[500],
    marginBottom: spacing[8],
    alignSelf: "stretch",
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: colors.natural[450],
    alignSelf: "stretch",
  },
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    marginBottom: spacing[12],
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  numBadgeText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: colors.primary[500],
    writingDirection: "ltr",
  },
  cardHeaderText: {
    flex: 1,
    flexShrink: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: colors.natural[450],
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: colors.natural[900],
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: "Cairo_400Regular",
    color: colors.natural[450],
    marginTop: spacing[8],
  },
});

export default LegalScreen;
