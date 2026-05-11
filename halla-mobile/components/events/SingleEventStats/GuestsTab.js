import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GuestListItem from "../GuestListItem";
import styles from "./styles";

const formatResponseDate = (respondAt, t) => {
  if (!respondAt) return t("guest.alerts.noResponseYet");
  const date = new Date(respondAt);
  return date.toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const GuestsTab = ({
  stats,
  searchQuery,
  guestActions,
  onEdit,
  onDelete,
  onRotateQr,
  onRevokeAccess,
  t,
}) => {
  const guests = useMemo(
    () =>
      (stats?.guests || []).map((guest) => {
        const id = guest.guestId || guest._id || guest.id;
        const local = guestActions[id] || {};
        return {
          id,
          name: guest.name || t("home.guest"),
          phone: guest.phone || "",
          status: guest.status || "invited",
          responseDate: formatResponseDate(
            guest.respondAt || guest.respondedAt,
            t
          ),
          addedBy: guest.addedBy || "",
          qrRotated: !!(guest.qrRotated || local.qrRotated),
          accessRevoked: !!(guest.accessRevoked || local.accessRevoked),
        };
      }),
    [stats?.guests, guestActions, t]
  );

  const filteredGuests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) => g.name.toLowerCase().includes(q) || g.phone.includes(q)
    );
  }, [guests, searchQuery]);

  if (filteredGuests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={40} color="#C8C8C8" />
        <Text style={styles.emptyStateText}>لا يوجد مدعوين حالياً</Text>
      </View>
    );
  }

  return filteredGuests.map((item, index) => (
    <GuestListItem
      key={item.id || index}
      guest={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onRotateQr={onRotateQr}
      onRevokeAccess={onRevokeAccess}
      index={index}
    />
  ));
};

export default GuestsTab;
