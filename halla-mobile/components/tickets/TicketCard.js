import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, useTranslation } from "../../localization";

const TicketCard = ({ ticket, onDelete, onEdit, onRate, index }) => {
  const { t } = useTranslation("tickets");

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "#f39c12";
      case "in_progress":
        return "#3498db";
      case "waiting_response":
        return "#9b59b6";
      case "resolved":
        return "#27ae60";
      case "closed":
        return "#95a5a6";
      default:
        return "#f39c12";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
  };

  const { date, time } = formatDate(ticket.createdAt);
  const statusColor = getStatusColor(ticket.status);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Top Section: Status and Actions */}
      <View style={styles.top}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}20` }]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(`status.${ticket.status}`)}
          </Text>
        </View>

        <View style={styles.actions}>
          {ticket.status === "open" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(ticket)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#3498db" />
                  <Text style={[styles.actionText, styles.editText]}>
                    {t("actions.edit")}
                  </Text>
            </TouchableOpacity>
          )}

          {(ticket.status === "resolved" || ticket.status === "closed") &&
            !ticket.userRating?.rating && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onRate && onRate(ticket)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={16} color="#f39c12" />
                <Text style={[styles.actionText, styles.rateText]}>
                  {t("ratingInline.rateButton")}
                </Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(ticket.id || ticket._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            <Text style={[styles.actionText, styles.deleteText]}>
              {t("actions.delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Type */}
      <Text style={styles.type}>
        {t(`types.${ticket.type}`)}
      </Text>

      {/* Bottom Section: Date and Message */}
      <View style={styles.bottom}>
        <View style={styles.dateContainer}>
          <Text style={styles.createdLabel}>
            {t("createdAt")}
          </Text>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>

        <Text
          style={styles.message}
          numberOfLines={2}
        >
          {ticket.message}
        </Text>
      </View>

      {/* Existing rating display */}
      {ticket.userRating?.rating > 0 && (
        <View style={styles.ratingRow}>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= ticket.userRating.rating ? "star" : "star-outline"}
                size={14}
                color="#f39c12"
              />
            ))}
          </View>
          <Text style={styles.ratedLabel}>{t("ratingInline.alreadyRated")}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },  statusText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold"
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },  actionText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold"
  },
  editText: {
    color: "#3498db"
  },
  rateText: {
    color: "#f39c12"
  },
  deleteText: {
    color: "#e74c3c"
  },
  type: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 12
  },  bottom: {
    gap: 8
  },  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },  createdLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#666"
  },  date: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#666"
  },  time: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999"
  },  message: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    lineHeight: 20
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  ratingStars: {
    flexDirection: "row",
    gap: 2,
  },
  ratedLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#f39c12",
  },
});

export default TicketCard;
