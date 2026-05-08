import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ContentSummary = ({ media = [], content, t }) => {
  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const commentCount = media.reduce(
    (acc, m) => acc + (m.commentsCount || m.comments?.length || 0),
    0
  );
  const likeCount =
    content?.stats?.totalLikes ??
    media.reduce((acc, m) => acc + (m.likesCount || m.likes?.length || 0), 0);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("host.summary.title")}</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{photoCount}</Text>
          <Text style={styles.summaryLabel}>{t("host.summary.photos")}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{videoCount}</Text>
          <Text style={styles.summaryLabel}>{t("host.summary.videos")}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{commentCount}</Text>
          <Text style={styles.summaryLabel}>{t("host.summary.comments")}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{likeCount}</Text>
          <Text style={styles.summaryLabel}>{t("host.summary.likes")}</Text>
        </View>
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
