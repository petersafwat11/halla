import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
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
 * Direction is handled GLOBALLY (I18nManager, set at the layout level): there is
 * NO per-component isRTL text/row branching. `flex-start`/`flex-end` are logical
 * start/end and auto-flip under RTL; `row` auto-flips to row-reverse. Text uses
 * the ambient writing direction so mixed LTR tokens (email, URLs, numbers)
 * embedded in Arabic render correctly via the platform bidi algorithm.
 *
 * Accessibility: title/section titles expose header roles and the screen scales
 * with Dynamic Type (font scaling is left enabled); cards shrink rather than clip.
 */
const LegalScreen = ({ data }) => {
  const { t, currentLanguage } = useTranslation("settings");
  const isRtl = currentLanguage === "ar";
  const localizedText = isRtl ? styles.rtlText : styles.ltrText;

  const sections = Array.isArray(data?.sections) ? data.sections : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={data?.title} showBack={true} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Document heading */}
          <View style={[styles.header, isRtl ? styles.alignEnd : styles.alignStart]}>
            {!!data?.badge && (
              <View style={[styles.badge, isRtl ? styles.alignSelfEnd : styles.alignSelfStart]}>
                <Text style={[styles.badgeText, localizedText]}>{data.badge}</Text>
              </View>
            )}
            {!!data?.title && (
              <Text style={[styles.title, localizedText]} accessibilityRole="header">
                {data.title}
              </Text>
            )}
            {!!data?.subtitle && (
              <Text style={[styles.subtitle, localizedText]}>{data.subtitle}</Text>
            )}
            {!!data?.lastUpdated && (
              <Text style={[styles.lastUpdated, localizedText]}>
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
                <View style={[styles.cardHeader, isRtl && styles.cardHeaderRtl]}>
                  {/* Section number stays visually stable (LTR digit) while the
                      title/body follow the ambient locale direction. */}
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeText}>{section.num}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    {!!section.label && (
                      <Text style={[styles.sectionLabel, localizedText]}>{section.label}</Text>
                    )}
                    {!!section.title && (
                      <Text style={[styles.sectionTitle, localizedText]} accessibilityRole="header">
                        {section.title}
                      </Text>
                    )}
                  </View>
                </View>

                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${section.id}-p${index}`}
                    style={[styles.paragraph, localizedText]}
                  >
                    {paragraph}
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
  },
  badge: {
    // Logical start alignment — auto-flips under a global RTL direction.
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
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: colors.primary[500],
    marginBottom: spacing[8],
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: colors.natural[450],
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
    // `row` auto-renders as row-reverse under a global RTL direction — no isRTL
    // branching. `flex-start` keeps the number badge at the top when a long
    // scaled title wraps (Dynamic Type) instead of centering + clipping.
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    marginBottom: spacing[12],
  },
  cardHeaderRtl: {
    flexDirection: "row-reverse",
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
  alignStart: {
    alignItems: "flex-start",
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  alignSelfStart: {
    alignSelf: "flex-start",
  },
  alignSelfEnd: {
    alignSelf: "flex-end",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  ltrText: {
    textAlign: "left",
    writingDirection: "ltr",
  },
});

export default LegalScreen;
