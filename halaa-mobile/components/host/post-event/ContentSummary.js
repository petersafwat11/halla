import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCount } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../../localization";
import LocalizedText from "../../commen/LocalizedText";

/**
 * Media summary. Counts are locale-formatted (٠١٢ / 0-9) and each value is
 * an LTR-isolated atomic token so it cannot BiDi-scramble in Arabic rows.
 */
const ContentSummary = ({ media = [], content, t }) => {
  const { currentLanguage } = useTranslation("postEvent");
  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const commentCount = media.reduce(
    (acc, m) => acc + (m.commentsCount || m.comments?.length || 0),
    0
  );
  const likeCount =
    content?.stats?.totalLikes ??
    media.reduce((acc, m) => acc + (m.likesCount || m.likes?.length || 0), 0);

  const stats = [
    { value: photoCount, label: t("host.summary.photos") },
    { value: videoCount, label: t("host.summary.videos") },
    { value: commentCount, label: t("host.summary.comments") },
    { value: likeCount, label: t("host.summary.likes") },
  ];

  return (
    <View style={styles.section}>
      <LocalizedText style={styles.sectionTitle}>
        {t("host.summary.title")}
      </LocalizedText>
      <View style={styles.summaryRow}>
        {stats.map(({ value, label }, index) => (
          <React.Fragment key={label}>
            {index > 0 && <View style={styles.summarySep} />}
            <View style={styles.summaryItem}>
              {/* Locale digits in one LTR-isolated token. */}
              <Text style={styles.summaryValue}>
                {isolateLtr(formatCount(value, currentLanguage))}
              </Text>
              <LocalizedText style={styles.summaryLabel}>{label}</LocalizedText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    paddingVertical: 8, backgroundColor: "#F9F4EF", borderRadius: 8,
  },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 20, fontFamily: "Cairo_700Bold", color: "#C28E5C" },
  summaryLabel: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#656565" },
  summarySep: { width: 1, height: 32, backgroundColor: "#E8D4C4" },
});

export default ContentSummary;
