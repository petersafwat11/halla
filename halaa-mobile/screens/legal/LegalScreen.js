import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isolateLtr } from "@halaa/shared/utils";
import { useTranslation } from "../../localization";
import { TopBar } from "../../components/plans";
import {
  colors,
  backgrounds,
  spacing,
  borderRadius,
} from "../../styles/tokens";

/**
 * Regex for intrinsically LTR tokens inside legal paragraphs:
 * email addresses, Saudi phone numbers, URLs, official Latin company name, store names.
 */
const LTR_LEGAL_TOKEN_REGEX =
  /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+966|05)\s*\d{1,2}\s*\d{3}\s*\d{4}|https?:\/\/[^\s)]+|Afaq hala Company For Communications and Information|App Store|Google Play)/g;

function isolateLegalParagraph(paragraph, isRtl) {
  if (!paragraph || !isRtl) return paragraph;

  // Split by LTR tokens and wrap matching tokens with Unicode isolate
  const parts = String(paragraph).split(LTR_LEGAL_TOKEN_REGEX);
  const matches = String(paragraph).match(LTR_LEGAL_TOKEN_REGEX);

  if (!matches) return paragraph;

  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(parts[i]);
    if (matches[i]) result.push(isolateLtr(matches[i]));
  }
  return result.join("");
}

/**
 * Reusable legal document screen (Privacy / Terms / Community Rules / Refund /
 * Deletion / Support). Receives a localized `data` object of shape:
 *   { badge, title, subtitle, lastUpdated, sections: [{ id, num, label, title, body }] }
 * Body paragraphs are separated by "\n\n".
 *
 * Direction is handled logically (root direction / I18nManager):
 * `flex-start` aligns to the logical reading start (right in Arabic, left in English).
 * `flexDirection: "row"` renders in logical start-to-end reading order.
 */
const LegalScreen = ({ data }) => {
  const { t, currentLanguage } = useTranslation("settings");
  const isRtl = currentLanguage === "ar";
  const localizedTextStyle = isRtl ? styles.rtlText : styles.ltrText;

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
                <Text style={[styles.badgeText, localizedTextStyle]}>{data.badge}</Text>
              </View>
            )}
            {!!data?.title && (
              <Text style={[styles.title, localizedTextStyle]} accessibilityRole="header">
                {data.title}
              </Text>
            )}
            {!!data?.subtitle && (
              <Text style={[styles.subtitle, localizedTextStyle]}>{data.subtitle}</Text>
            )}
            {!!data?.lastUpdated && (
              <Text style={[styles.lastUpdated, localizedTextStyle]}>
                {t("legal.lastUpdated", { defaultValue: "Last updated" })}:{" "}
                {data.lastUpdated}
              </Text>
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
                      <Text style={[styles.sectionLabel, localizedTextStyle]}>
                        {section.label}
                      </Text>
                    )}
                    {!!section.title && (
                      <Text
                        style={[styles.sectionTitle, localizedTextStyle]}
                        accessibilityRole="header"
                      >
                        {section.title}
                      </Text>
                    )}
                  </View>
                </View>

                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${section.id}-p${index}`}
                    style={[styles.paragraph, localizedTextStyle]}
                  >
                    {isolateLegalParagraph(paragraph, isRtl)}
                  </Text>
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
  rtlText: {
    writingDirection: "rtl",
  },
  ltrText: {
    writingDirection: "ltr",
  },
});

export default LegalScreen;
