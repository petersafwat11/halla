/**
 * Staff Portal Screen
 * Allows event staff to log in with phone + eventId, view the guest list,
 * check in guests (by tap or QR code text), and see real-time stats.
 *
 * Auth: Uses its own staff session JWT (stored in AsyncStorage), NOT the user's Bearer token.
 * Accessible from AuthStack — no main app login required.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../localization";
import * as staffService from "../services/staffService";

// ─────────────────────────────────────────────────────────
// STATUS BADGE COLORS
// ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  invited:    { bg: "#F3F4F6", text: "#6B7280" },
  confirmed:  { bg: "#EAF4EF", text: "#2A8C5B" },
  declined:   { bg: "#F9EBEA", text: "#C0392B" },
  maybe:      { bg: "#FFF9E6", text: "#CA8A04" },
  checked_in: { bg: "#EEF2FF", text: "#4338CA" },
  no_show:    { bg: "#F3F4F6", text: "#9CA3AF" },
};

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, icon }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const GuestCard = ({ guest, onCheckIn, t }) => {
  const statusColor = STATUS_COLORS[guest.status] || STATUS_COLORS.invited;
  const isCheckedIn = guest.status === "checked_in";

  return (
    <View style={styles.guestCard}>
      <View style={styles.guestInfo}>
        <Text style={styles.guestName}>{guest.name}</Text>
        <Text style={styles.guestPhone}>{guest.phone}</Text>
        {guest.email ? <Text style={styles.guestEmail}>{guest.email}</Text> : null}
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

// ─────────────────────────────────────────────────────────
// LOGIN VIEW
// ─────────────────────────────────────────────────────────

const LoginView = ({ onVerified, t }) => {
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!phone.trim()) newErrors.phone = t("login.errors.phoneRequired");
    if (!eventId.trim()) newErrors.eventId = t("login.errors.eventIdRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await staffService.verifyByPhone(phone.trim(), eventId.trim());
      if (result?.verified) {
        onVerified(result);
      } else {
        Alert.alert("", t("login.errors.invalidCredentials"));
      }
    } catch (err) {
      Alert.alert("", err.message || t("login.errors.verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.loginContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.loginScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Header */}
        <View style={styles.loginHeader}>
          <View style={styles.loginIconWrap}>
            <Ionicons name="people" size={40} color="#C28E5C" />
          </View>
          <Text style={styles.loginTitle}>{t("login.title")}</Text>
          <Text style={styles.loginSubtitle}>{t("login.subtitle")}</Text>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("login.phoneLabel")}</Text>
          <View style={[styles.inputRow, errors.phone && styles.inputRowError]}>
            <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t("login.phonePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>
          {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
        </View>

        {/* Event ID */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("login.eventIdLabel")}</Text>
          <View style={[styles.inputRow, errors.eventId && styles.inputRowError]}>
            <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t("login.eventIdPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={eventId}
              onChangeText={(v) => { setEventId(v); setErrors((e) => ({ ...e, eventId: undefined })); }}
              autoCapitalize="none"
              textAlign="right"
            />
          </View>
          {errors.eventId ? <Text style={styles.fieldError}>{errors.eventId}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyBtnText}>{t("login.verifyButton")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────
// QR CHECK-IN MODAL
// ─────────────────────────────────────────────────────────

const QRModal = ({ visible, onClose, onSubmit, t }) => {
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) return;
    onSubmit(code.trim());
    setCode("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("checkIn.qrTitle")}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color="#2C2C2C" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>{t("checkIn.qrLabel")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="qr-code-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("checkIn.qrPlaceholder")}
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                textAlign="right"
              />
            </View>
            <TouchableOpacity
              style={[styles.verifyBtn, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={!code.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.verifyBtnText}>{t("checkIn.qrButton")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────
// PORTAL VIEW
// ─────────────────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Stats */}
      <View style={styles.statsRow}>
        {statCards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </View>

      {/* Search */}
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

      {/* Guest List */}
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

      {/* Floating QR Button */}
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

// ─────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────

export default function StaffPortalScreen() {
  const { t } = useTranslation("staff");
  const [staffInfo, setStaffInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventId, setEventId] = useState(null);

  const handleVerified = (result) => {
    setStaffInfo(result.staff);
    setEventInfo(result.event);
    setEventId(result.event?._id);
  };

  const handleLogout = () => {
    Alert.alert(
      t("portal.logout"),
      "",
      [
        { text: t("checkIn.cancel"), style: "cancel" },
        {
          text: t("portal.logout"),
          style: "destructive",
          onPress: async () => {
            await staffService.clearStaffToken();
            setStaffInfo(null);
            setEventInfo(null);
            setEventId(null);
          },
        },
      ]
    );
  };

  const isAuthenticated = !!staffInfo && !!eventId;

  return (
    <SafeAreaView style={styles.screen}>
      {isAuthenticated ? (
        <PortalView
          staffInfo={staffInfo}
          eventInfo={eventInfo}
          eventId={eventId}
          onLogout={handleLogout}
          t={t}
        />
      ) : (
        <LoginView onVerified={handleVerified} t={t} />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },

  // ── Login ──
  loginContainer: {
    flex: 1,
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  loginHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  loginIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputRowError: {
    borderColor: "#C0392B",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 10,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#C0392B",
    marginTop: 4,
  },
  verifyBtn: {
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  verifyBtnDisabled: {
    opacity: 0.65,
  },
  verifyBtnText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },

  // ── Portal ──
  portalContainer: {
    flex: 1,
  },
  portalHeader: {
    backgroundColor: "#C28E5C",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  portalHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
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
  logoutBtn: {
    padding: 8,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },

  // ── Search ──
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 8,
  },

  // ── Guest List ──
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
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

  // ── Empty / Loading ──
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

  // ── FAB ──
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

  // ── QR Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
});
