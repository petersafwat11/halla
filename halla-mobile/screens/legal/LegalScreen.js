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
 * Reusable legal document screen (Privacy Policy / Terms & Conditions).
 * Receives a localized `data` object of shape:
 *   { badge, title, subtitle, lastUpdated, sections: [{ id, num, label, title, body }] }
 * Body paragraphs are separated by "\n\n".
 */
const LegalScreen = ({ data }) => {
  const { t, isRTL } = useTranslation("settings");

  const textAlign = isRTL ? "right" : "left";
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
          <View style={styles.header}>
            {!!data?.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.badge}</Text>
              </View>
            )}
            {!!data?.title && (
              <Text style={[styles.title, { textAlign }]}>{data.title}</Text>
            )}
            {!!data?.subtitle && (
              <Text style={[styles.subtitle, { textAlign }]}>
                {data.subtitle}
              </Text>
            )}
            {!!data?.lastUpdated && (
              <Text style={[styles.lastUpdated, { textAlign }]}>
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
                <View
                  style={[
                    styles.cardHeader,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeText}>{section.num}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    {!!section.label && (
                      <Text style={[styles.sectionLabel, { textAlign }]}>
                        {section.label}
                      </Text>
                    )}
                    {!!section.title && (
                      <Text style={[styles.sectionTitle, { textAlign }]}>
                        {section.title}
                      </Text>
                    )}
                  </View>
                </View>

                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${section.id}-p${index}`}
                    style={[styles.paragraph, { textAlign }]}
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
    alignItems: "center",
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
  },
  cardHeaderText: {
    flex: 1,
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
