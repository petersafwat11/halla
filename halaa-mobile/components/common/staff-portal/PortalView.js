import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatCard from "./StatCard";
import GuestCard from "./GuestCard";
import QRModal from "./QRModal";
import { useStaffEventGuests } from "../../../hooks/staff";
import { useCheckInGuest } from "../../../hooks/staff";

const STATUS_OPTIONS = [
  { key: "all", value: "" },
  { key: "invited", value: "invited" },
  { key: "confirmed", value: "confirmed" },
  { key: "checked_in", value: "checked_in" },
  { key: "declined", value: "declined" },
];

const PortalView = ({ staffInfo, eventInfo, eventId, onLogout, t }) => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const searchTimer = useRef(null);

  const guestsQuery = useStaffEventGuests(eventId, {
    search,
    status,
    limit: 100,
  });
  const checkInMutation = useCheckInGuest();

  const guests = guestsQuery.data?.guests || [];
  const stats = guestsQuery.data?.stats || {
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    declined: 0,
    pending: 0,
  };

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(text), 400);
  };

  const handleRefresh = () => {
    guestsQuery.refetch();
  };

  const performCheckIn = useCallback(
    async (guest) => {
      try {
        const result = await checkInMutation.mutateAsync({
          eventId,
          guestId: guest._id || guest.id,
        });
        if (result?.alreadyCheckedIn) {
          Alert.alert("", t("checkIn.alreadyDone", { name: guest.name }));
        } else {
          Alert.alert("", t("checkIn.success"));
        }
      } catch (err) {
        const reason = err?.reason;
        if (reason === "staff_revoked") {
          Alert.alert("", t("errors.staffRevoked"));
        } else if (reason === "staff_expired") {
          Alert.alert("", t("errors.staffExpired"));
        } else {
          Alert.alert("", err.message || t("errors.checkInFailed"));
        }
      }
    },
    [checkInMutation, eventId, t]
  );

  const handleGuestCheckIn = (guest) => {
    Alert.alert(
      t("checkIn.confirmTitle"),
      t("checkIn.confirmMessage", { name: guest.name }),
      [
        { text: t("checkIn.cancel"), style: "cancel" },
        { text: t("checkIn.confirm"), onPress: () => performCheckIn(guest) },
      ]
    );
  };

  const handleQRSubmit = async (qrCode) => {
    try {
      const result = await checkInMutation.mutateAsync({ eventId, qrCode });
      if (result?.alreadyCheckedIn) {
        Alert.alert("", t("checkIn.alreadyDone", { name: result?.guest?.name || "" }));
      } else {
        Alert.alert("", t("checkIn.success"));
      }
    } catch (err) {
      Alert.alert("", err.message || t("errors.checkInFailed"));
    }
  };

  const statCards = useMemo(
    () => [
      { key: "pending",   label: t("stats.pending"),   value: stats.pending   || 0, color: "#6B7280", icon: "time-outline" },
      { key: "confirmed", label: t("stats.confirmed"), value: stats.confirmed || 0, color: "#2A8C5B", icon: "checkmark-circle-outline" },
      { key: "declined",  label: t("stats.declined"),  value: stats.declined  || 0, color: "#C0392B", icon: "close-circle-outline" },
      { key: "checkedIn", label: t("stats.checkedIn"), value: stats.checkedIn || 0, color: "#4338CA", icon: "checkmark-done-outline" },
    ],
    [stats, t]
  );

  return (
    <View style={styles.portalContainer}>
      <View style={styles.portalHeader}>
        <View style={styles.portalHeaderLeft}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {eventInfo?.title || ""}
          </Text>
          <Text style={styles.staffName}>{staffInfo?.name || ""}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {statCards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("portal.searchPlaceholder")}
          placeholderTextColor="#9CA3AF"
          value={searchInput}
          onChangeText={handleSearch}
          textAlign="right"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchInput("");
              setSearch("");
            }}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statusFilterRow}>
        {STATUS_OPTIONS.map((opt) => {
          const isActive = status === opt.value;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.statusChip, isActive && styles.statusChipActive]}
              onPress={() => setStatus(opt.value)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.statusChipText,
                  isActive && styles.statusChipTextActive,
                ]}
              >
                {t(`filters.${opt.key === "checked_in" ? "checkedIn" : opt.key === "all" ? "allStatuses" : opt.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {guestsQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#C28E5C" />
          <Text style={styles.centerStateText}>{t("portal.loadingGuests")}</Text>
        </View>
      ) : guests.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={styles.centerStateText}>
            {search ? t("portal.noGuestsSearch") : t("portal.noGuests")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={guests}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          renderItem={({ item }) => (
            <GuestCard guest={item} onCheckIn={handleGuestCheckIn} t={t} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={guestsQuery.isFetching && !guestsQuery.isLoading}
              onRefresh={handleRefresh}
              colors={["#C28E5C"]}
              tintColor="#C28E5C"
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowQRModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="qr-code-outline" size={28} color="#FFF" />
      </TouchableOpacity>

      <QRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        onSubmit={handleQRSubmit}
        t={t}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  portalContainer: { flex: 1 },
  portalHeader: {
    backgroundColor: "#C28E5C",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  portalHeaderLeft: { flex: 1, marginEnd: 12 },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  staffName: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  logoutBtn: { padding: 8 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    minHeight: 46,
  },
  searchIcon: { marginEnd: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 8,
  },
  statusFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DFDFDF",
  },
  statusChipActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  statusChipTextActive: { color: "#FFF" },
  listContent: { paddingHorizontal: 12, paddingBottom: 100 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingBottom: 80,
  },
  centerStateText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#9CA3AF",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default PortalView;
