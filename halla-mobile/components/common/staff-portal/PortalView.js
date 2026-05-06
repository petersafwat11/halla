import React, { useState, useCallback, useEffect, useRef } from "react";
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
import * as staffService from "../../../services/staffService";
import StatCard from "./StatCard";
import GuestCard from "./GuestCard";
import QRModal from "./QRModal";

const PortalView = ({ staffInfo, eventInfo, eventId, onLogout, t }) => {
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, checkedIn: 0, declined: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const searchTimer = useRef(null);

  const fetchData = useCallback(async (searchQuery = "") => {
    try {
      const result = await staffService.getEventGuests(eventId, {
        search: searchQuery || undefined,
        limit: 100,
      });
      setGuests(result.guests || []);
      setStats(result.stats || {});
    } catch (err) {
      Alert.alert("", t("errors.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchData(text), 400);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(search);
  };

  const performCheckIn = useCallback(async (guest) => {
    try {
      const result = await staffService.checkInById(eventId, guest._id || guest.id);
      if (result?.alreadyCheckedIn) {
        Alert.alert("", t("checkIn.alreadyDone", { name: guest.name }));
      } else {
        Alert.alert("", t("checkIn.success"));
      }
      fetchData(search);
    } catch (err) {
      Alert.alert("", err.message || t("errors.checkInFailed"));
    }
  }, [eventId, search, fetchData, t]);

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
      const result = await staffService.checkInByQR(eventId, qrCode);
      if (result?.alreadyCheckedIn) {
        Alert.alert("", t("checkIn.alreadyDone", { name: result?.guest?.name || "" }));
      } else {
        Alert.alert("", t("checkIn.success"));
      }
      fetchData(search);
    } catch (err) {
      Alert.alert("", err.message || t("errors.checkInFailed"));
    }
  };

  const statCards = [
    { key: "pending",   label: t("stats.pending"),   value: stats.pending   || 0, color: "#6B7280", icon: "time-outline" },
    { key: "confirmed", label: t("stats.confirmed"),  value: stats.confirmed || 0, color: "#2A8C5B", icon: "checkmark-circle-outline" },
    { key: "declined",  label: t("stats.declined"),   value: stats.declined  || 0, color: "#C0392B", icon: "close-circle-outline" },
    { key: "checkedIn", label: t("stats.checkedIn"),  value: stats.checkedIn || 0, color: "#4338CA", icon: "checkmark-done-outline" },
  ];

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
          value={search}
          onChangeText={handleSearch}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); fetchData(""); }}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
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
              refreshing={refreshing}
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
  portalHeaderLeft: { flex: 1, marginRight: 12 },
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
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 8,
  },
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
