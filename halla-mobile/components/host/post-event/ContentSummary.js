import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ContentSummary = ({ photos, content, t }) => {
  const videoCount = content?.posts?.filter((p) => p.type === "video")?.length || 0;
  const commentCount = content?.posts?.reduce((acc, p) => acc + (p.commentsCount || 0), 0) || 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("hostPostEvent.summary.title", "ملخص المحتوى")}</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{photos.length}</Text>
          <Text style={styles.summaryLabel}>{t("hostPostEvent.summary.photos", "صورة")}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{videoCount}</Text>
          <Text style={styles.summaryLabel}>{t("hostPostEvent.summary.videos", "فيديو")}</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{commentCount}</Text>
          <Text style={styles.summaryLabel}>{t("hostPostEvent.summary.comments", "تعليق")}</Text>
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
