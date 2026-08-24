import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
import { useTranslation } from "../../../localization";

/**
 * List header for the guest post-event screen. Renders the event +
 * guest meta strip and the thank-you card.
 *
 * Event titles, guest names and host thank-you copy are backend/user
 * content → `AdaptiveText` (first-strong direction + isolation). The
 * backend thank-you model carries optional per-language variants
 * (`textAr`/`textEn`); exactly one locale-appropriate value renders —
 * never both languages stacked (blueprint §6).
 */
const GuestEventHeader = ({ eventInfo, guestInfo, thankYouMessage, postsCount, t }) => {
  const { currentLanguage } = useTranslation("postEvent");
  const isArabic = (currentLanguage || "ar") === "ar";

  const localizedThankYou = (() => {
    if (!thankYouMessage) return "";
    if (isArabic) return thankYouMessage.textAr || thankYouMessage.text || "";
    return thankYouMessage.textEn || thankYouMessage.text || "";
  })();

  return (
    <View>
      <View style={styles.eventHeader}>
        <View style={styles.eventHeaderIcon}>
          <Ionicons name="sparkles" size={28} color="#c28e5c" />
        </View>
        <View style={styles.eventHeaderText}>
          {eventInfo?.title && (
            <AdaptiveText style={styles.eventTitle} numberOfLines={2}>
              {eventInfo.title}
            </AdaptiveText>
          )}
          {guestInfo?.name && (
            <View style={styles.guestNameRow}>
              {/* Semantic leading glyph stays outside the text run so a Latin
                  name cannot reorder around it in an Arabic row. */}
              <Ionicons name="person" size={13} color="#a0a0a0" />
              <AdaptiveText style={styles.guestName} numberOfLines={1}>
                {guestInfo.name}
              </AdaptiveText>
            </View>
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
        <AdaptiveText style={styles.thankYouTitle}>
          {localizedThankYou || t("thankYou.defaultTitle")}
        </AdaptiveText>
      </View>

      {postsCount === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#e0d5cc" />
          <LocalizedText role="sectionTitle" style={styles.emptyTitle} center>
            {t("noContent")}
          </LocalizedText>
          <LocalizedText role="description" style={styles.emptyDesc} center>
            {t("noContentDesc")}
          </LocalizedText>
        </View>
      )}
    </View>
  );
};

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
  guestNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  guestName: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
    flexShrink: 1,
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
