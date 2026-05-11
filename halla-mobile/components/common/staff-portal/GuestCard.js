import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATUS_COLORS = {
  invited:    { bg: "#F3F4F6", text: "#6B7280" },
  confirmed:  { bg: "#EAF4EF", text: "#2A8C5B" },
  declined:   { bg: "#F9EBEA", text: "#C0392B" },
  maybe:      { bg: "#FFF9E6", text: "#CA8A04" },
  checked_in: { bg: "#EEF2FF", text: "#4338CA" },
  no_show:    { bg: "#F3F4F6", text: "#9CA3AF" },
};

const GuestCard = ({ guest, onCheckIn, t }) => {
  const statusColor = STATUS_COLORS[guest.status] || STATUS_COLORS.invited;
  const isCheckedIn = guest.status === "checked_in";

  return (
    <View style={styles.guestCard}>
      <View style={styles.guestInfo}>
        <Text style={styles.guestName}>{guest.name}</Text>
        <Text style={styles.guestPhone}>{guest.phone}</Text>
      </View>
      <View style={styles.guestRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {t(`status.${guest.status}`, guest.status)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.checkInBtn, isCheckedIn && styles.checkInBtnDone]}
          onPress={() => !isCheckedIn && onCheckIn(guest)}
          disabled={isCheckedIn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCheckedIn ? "checkmark-done" : "checkmark"}
            size={16}
            color={isCheckedIn ? "#9CA3AF" : "#FFF"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  guestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  guestInfo: {
    flex: 1,
    marginRight: 10,
  },
  guestName: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  guestPhone: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  guestEmail: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    marginTop: 1,
  },
  guestRight: {
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
  checkInBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
  },
  checkInBtnDone: {
    backgroundColor: "#F3F4F6",
  },
});

export default GuestCard;
