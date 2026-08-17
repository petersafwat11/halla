import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStatusVisual } from "../../constants/statusColors";

const EventListItem = ({ event, onPress }) => {
  const formatDateTime = () => {
    if (event.date) {
      const date = new Date(event.date);
      const dateStr = date.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      });
      const timeStr = event.time || "";
      return `${dateStr}${timeStr ? " - " + timeStr : ""}`;
    }
    return "غير محدد";
  };

  const guestCount = event.guestCount || event.totalInvites || 0;
  const confirmed = event.confirmedCount || event.confirmed || 0;
  const declined = event.declinedCount || event.declined || 0;
  const noResponse = Math.max(0, guestCount - confirmed - declined);

  const getStatusStyle = (status) => {
    const v = getStatusVisual(status);
    switch (status) {
      case "live":
        return { bg: v.bg, color: v.fg, label: "مباشرة" };
      case "scheduled":
        return { bg: v.bg, color: v.fg, label: "مجدولة" };
      case "draft":
        return { bg: v.bg, color: v.fg, label: "مسودة" };
      case "completed":
        return { bg: v.bg, color: v.fg, label: "منتهية" };
      case "cancelled":
        return { bg: v.bg, color: v.fg, label: "ملغية" };
      case "pending_scheduling":
        return { bg: v.bg, color: v.fg, label: "في انتظار الجدولة" };
      case "suspended":
        return { bg: v.bg, color: v.fg, label: "موقوفة" };
      default:
        return { bg: v.bg, color: v.fg, label: status || "غير محدد" };
    }
  };

  const status = getStatusStyle(event.status);
  // Stat dots — route through the same helper so dots match the badge palette.
  const confirmedDot = getStatusVisual("confirmed").fg;
  const declinedDot = getStatusVisual("declined").fg;
  const noResponseDot = getStatusVisual("invited").fg;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top row: image + info on the start (right in RTL), status at the end */}
      <View style={styles.topRow}>
        <View style={styles.mainGroup}>
          <View style={styles.imageContainer}>
            {event.image ? (
              <Image source={{ uri: event.image }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={22} color="#C28E5C" />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {event.title || "مناسبة بدون عنوان"}
            </Text>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{formatDateTime()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{guestCount} ضيف</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: confirmedDot }]} />
          <Text style={styles.statText}>موافق {confirmed}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: declinedDot }]} />
          <Text style={styles.statText}>معتذر {declined}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: noResponseDot }]} />
          <Text style={styles.statText}>لم يرد {noResponse}</Text>
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
    paddingVertical: 1,
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
  },
  statItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
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
