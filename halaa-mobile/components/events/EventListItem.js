import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDate, formatTime, formatGuestCount, formatCount } from "@halaa/shared/utils/locale";
import { getStatusVisual } from "../../constants/statusColors";
import { useTranslation } from "../../localization";
import { getImageUrl } from "../../utils/imageUtils";
import AdaptiveText from "../commen/AdaptiveText";

const EventListItem = ({ event, onPress }) => {
  const { t, currentLanguage } = useTranslation("events");

  const formatDateTimeStr = () => {
    if (event?.date) {
      const dateStr = formatDate(event.date, currentLanguage);
      const timeStr = event.time ? formatTime(event.time, currentLanguage) : "";
      return `${dateStr}${timeStr ? "  •  " + timeStr : ""}`;
    }
    return t("list.unspecified", { defaultValue: "غير محدد" });
  };

  const guestCount = event?.guestCount || event?.totalInvites || 0;
  const confirmed = event?.confirmedCount || event?.confirmed || 0;
  const declined = event?.declinedCount || event?.declined || 0;
  const noResponse = Math.max(0, guestCount - confirmed - declined);

  const getStatusStyle = (statusKey) => {
    const v = getStatusVisual(statusKey);
    const label = t(`list.status.${statusKey}`, {
      defaultValue: statusKey || t("list.unspecified", { defaultValue: "غير محدد" }),
    });
    return { bg: v.bg, color: v.fg, label };
  };

  const status = getStatusStyle(event?.status);
  const confirmedDot = getStatusVisual("confirmed").fg;
  const declinedDot = getStatusVisual("declined").fg;
  const noResponseDot = getStatusVisual("invited").fg;

  const titleText = event?.title || t("list.untitled", { defaultValue: "مناسبة بدون عنوان" });
  const guestCountText = formatGuestCount(guestCount, currentLanguage, t);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${titleText} - ${status.label}`}
    >
      {/* Top row: image + info on the start, status at the end */}
      <View style={styles.topRow}>
        <View style={styles.mainGroup}>
          <View style={styles.imageContainer}>
            {event?.image ? (
              <Image source={{ uri: getImageUrl(event.image) }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={22} color="#C28E5C" />
              </View>
            )}
          </View>

          <View style={styles.info}>
            {/* Event titles are arbitrary backend content — first-strong
                direction with isolation, not the page locale. */}
            <AdaptiveText style={styles.title} numberOfLines={1}>
              {titleText}
            </AdaptiveText>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{formatDateTimeStr()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{guestCountText}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Stats row — 3 equal-width flex columns. Label + count live in one
          interpolated translation string so punctuation/digit order is
          authored per locale, never concatenated in JSX. */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: confirmedDot }]} />
          <Text style={styles.statText} numberOfLines={1}>
            {t("list.stats.confirmedCount", {
              defaultValue: "موافق {{count}}",
              count: formatCount(confirmed, currentLanguage),
            })}
          </Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: declinedDot }]} />
          <Text style={styles.statText} numberOfLines={1}>
            {t("list.stats.declinedCount", {
              defaultValue: "اعتذار {{count}}",
              count: formatCount(declined, currentLanguage),
            })}
          </Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: noResponseDot }]} />
          <Text style={styles.statText} numberOfLines={1}>
            {t("list.stats.noResponseCount", {
              defaultValue: "لم يرد {{count}}",
              count: formatCount(noResponse, currentLanguage),
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  mainGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F9F4EF",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#1F2937",
    lineHeight: 22,
    alignSelf: "stretch",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
    lineHeight: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#6B7280",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    gap: 4,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#374151",
    lineHeight: 16,
  },
});

export default EventListItem;
