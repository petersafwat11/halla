import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * List header for the guest post-event screen. Renders the event +
 * guest meta strip and the thank-you card. Lives in its own file so
 * the screen stays under the 350-line cap.
 */
const GuestEventHeader = ({ eventInfo, guestInfo, thankYouMessage, postsCount, t }) => (
  <View>
    <View style={styles.eventHeader}>
      <View style={styles.eventHeaderIcon}>
        <Ionicons name="sparkles" size={28} color="#c28e5c" />
      </View>
      <View style={styles.eventHeaderText}>
        {eventInfo?.title && (
          <Text style={styles.eventTitle} numberOfLines={2}>
            {eventInfo.title}
          </Text>
        )}
        {guestInfo?.name && (
          <Text style={styles.guestName}>
            <Ionicons name="person" size={13} color="#a0a0a0" />{" "}
            {guestInfo.name}
          </Text>
        )}
      </View>
    </View>

    <View style={styles.thankYouCard}>
      <Ionicons
        name="heart"
        size={24}
        color="#e74c3c"
        style={styles.thankYouIcon}
      />
      <Text style={styles.thankYouTitle}>
        {thankYouMessage?.text || t("thankYou.defaultTitle")}
      </Text>
      {thankYouMessage?.textAr && (
        <Text style={styles.thankYouSubtitle}>{thankYouMessage.textAr}</Text>
      )}
    </View>

    {postsCount === 0 && (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color="#e0d5cc" />
        <Text style={styles.emptyTitle}>{t("noContent")}</Text>
        <Text style={styles.emptyDesc}>{t("noContentDesc")}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 12,
    gap: 12,
  },
  eventHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
  },
  eventHeaderText: { flex: 1 },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    lineHeight: 26,
  },
  guestName: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
    marginTop: 2,
  },
  thankYouCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f5ece4",
  },
  thankYouIcon: { marginBottom: 8 },
  thankYouTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
    lineHeight: 26,
  },
  thankYouSubtitle: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginTop: 16,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});

export default GuestEventHeader;
