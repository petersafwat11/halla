import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { getStatusVisual } from "../../constants/statusColors";
import { useTranslation } from "../../localization";
import AdaptiveText from "../commen/AdaptiveText";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/**
 * Label follows the UI locale; `adaptive` marks values that are arbitrary
 * backend/user content (names, usernames) rendered with first-strong
 * direction instead of inheriting the page locale.
 */
const DetailRow = ({ label, value, adaptive = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    {adaptive ? (
      <AdaptiveText style={styles.detailValue}>{value}</AdaptiveText>
    ) : (
      <Text style={styles.detailValue}>{value}</Text>
    )}
  </View>
);

/**
 * The long-press menu offers:
 *   - "Rotate QR" (regenerates the guest's QR; old QR returns 410
 *     `qr_rotated`); and
 *   - "Revoke post-event access" (revokes the GuestAccessToken used
 *     for post-event content; old token returns 410 `qr_revoked`).
 *
 * Edit and delete remain on the inline action row.
 */
const GuestListItem = ({
  guest,
  onEdit,
  onDelete,
  onRotateQr,
  onRevokeAccess,
  // Select-mode props. When `selectable`, the row toggles selection on press
  // (and shows a checkbox) instead of exposing the per-row edit/delete actions.
  selectable = false,
  selected = false,
  onToggle,
}) => {
  const { t } = useTranslation("events");

  const getStatusStyle = (status) => {
    // Backend RSVP default (no response) → treat as "invited" for the tone.
    switch (status) {
      case "confirmed":
        return {
          ...getStatusVisual("confirmed"),
          label: t("guestTableExtras.status.confirmed", "Confirmed"),
        };
      case "checked_in":
        return {
          ...getStatusVisual("checked_in"),
          label: t("guestTableExtras.status.checkedIn", "Checked in"),
        };
      case "declined":
        return {
          ...getStatusVisual("declined"),
          label: t("guestTableExtras.status.declined", "Declined"),
        };
      default:
        return {
          ...getStatusVisual("invited"),
          label: t("guestTableExtras.status.invited", "Invited"),
        };
    }
  };

  const statusStyle = getStatusStyle(guest.status);
  const addedByValue =
        guest.addedBy?.name ||
    (typeof guest.addedBy === "string" && !OBJECT_ID_PATTERN.test(guest.addedBy)
      ? guest.addedBy
      : null) ||
    t("guestTableExtras.notAvailable", "—");
  const invitation = guest.invitation || {};
  const channel = invitation.effectiveChannel || invitation.method;
  const sentViaValue = channel
    ? channel === "whatsapp"
      ? t("guestTableExtras.whatsapp", "WhatsApp")
      : invitation.smsFallback
      ? t("guestTableExtras.smsFallback", "SMS (fallback)")
      : t("guestTableExtras.sms", "SMS")
    : t("guestTableExtras.notAvailable", "—");
  const autoReminderValue = invitation.autoReminderSent
    ? guest.autoReminderDate
      ? t("guestTableExtras.sentOn", { date: guest.autoReminderDate })
      : t("guestTableExtras.sent", "Sent")
    : t("guestTableExtras.notSent", "Not sent");
  const responseTimeValue =
    guest.responseDate || t("guestTableExtras.noResponse", "No response yet");

  const handleRotateQr = () => {
    if (!onRotateQr) return;
    Alert.alert(
      t("guestList.rotateQrTitle"),
      t("guestList.rotateQrBody", { name: guest.name || t("guestList.guestFallback"),
      }),
      [
        { text: t("guest.alerts.cancel"), style: "cancel" },
        {
          text: t("guestList.rotateQrAction"),
          style: "destructive",
          onPress: () => onRotateQr(guest),
        },
      ]
    );
  };

  const handleRevokeAccess = () => {
    if (!onRevokeAccess) return;
    Alert.alert(
      t("guestList.revokeAccessTitle"),
      t("guestList.revokeAccessBody", {
        name: guest.name || t("guestList.guestFallback"),
      }),
      [
        { text: t("guest.alerts.cancel"), style: "cancel" },
        {
          text: t("guestList.revokeAccessAction"),
          style: "destructive",
          onPress: () => onRevokeAccess(guest),
        },
      ]
    );
  };

  const handleLongPress = () => {
    const options = [];
    if (onEdit)
      options.push({
        text: t("guestList.editGuestAction"),
        onPress: () => onEdit(guest),
      });
    if (onRotateQr)
      options.push({
        text: t("guestList.rotateQrShort"),
        style: "destructive",
        onPress: handleRotateQr,
      });
    if (onRevokeAccess)
      options.push({
        text: t("guestList.revokeContentAccess"),
        style: "destructive",
        onPress: handleRevokeAccess,
      });
    if (onDelete)
      options.push({
        text: t("guestList.deleteGuestAction"),
        style: "destructive",
        onPress: () => onDelete(guest),
      });
    if (options.length === 0) return;
    Alert.alert(
      guest?.name || t("guestList.guestFallback"),
      t("guestList.chooseAction"),
      [
        ...options,
        { text: t("guestList.close"), style: "cancel" },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, selectable && selected && styles.containerSelected]}
      activeOpacity={0.85}
      onPress={selectable ? () => onToggle?.(guest) : undefined}
      onLongPress={selectable ? undefined : handleLongPress}
      delayLongPress={350}
    >
      {/* Header — name/phone on the start (right in RTL), actions on the end */}
      <View style={styles.header}>
        <View style={styles.guestInfo}>
          <View style={styles.nameRow}>
            {/* Guest names are arbitrary user content — first-strong direction. */}
            <AdaptiveText style={styles.name} numberOfLines={1}>
              {guest.name || t("guestList.guestFallback")}
            </AdaptiveText>
            {guest?.accessRevoked ? (
              <View style={[styles.guestBadge, styles.guestBadgeMuted]}>
                <Text style={styles.guestBadgeText}>
                  {t("guestList.accessRevokedBadge")}
                </Text>
              </View>
            ) : guest?.qrRotated ? (
              <View style={[styles.guestBadge, styles.guestBadgeHighlight]}>
                <Text style={styles.guestBadgeText}>
                  {t("guestList.qrUpdatedBadge")}
                </Text>
              </View>
            ) : null}
          </View>

          {!!guest.phone && (
            <Text style={styles.contactText}>{isolateLtr(guest.phone)}</Text>
          )}
        </View>

        <View style={styles.actions}>
          {selectable ? (
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
              {selected ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
            </View>
          ) : (
            <>
              {typeof onEdit === "function" ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(guest)}
                  activeOpacity={0.7}
                >
                  <View style={styles.editButton}>
                    <Ionicons name="create-outline" size={16} color="#6B4E33" />
                  </View>
                </TouchableOpacity>
              ) : null}
              {typeof onDelete === "function" ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onDelete(guest)}
                  activeOpacity={0.7}
                >
                  <View style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={16} color="#C0392B" />
                  </View>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Web-table parity: status, added by, delivery channel, reminder, response time. */}
      <View style={styles.responseCard}>
        <View style={styles.responseRow}>
          <Text style={styles.responseLabel}>
            {t("guestList.status", "Status")}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
        <View style={styles.detailsDivider} />
        <DetailRow
          label={t("guestTableExtras.addedBy", "Added by")}
          value={addedByValue}
          adaptive
        />
        <DetailRow
          label={t("guestTableExtras.sentVia", "Sent via")}
          value={sentViaValue}
        />
        <DetailRow
          label={t("guestTableExtras.autoReminder", "Auto reminder")}
          value={autoReminderValue}
        />
        <DetailRow
          label={t("guestTableExtras.responseTime", "Response time")}
          value={responseTimeValue}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    // Logical start = right in Arabic and left in English.
    borderStartWidth: 6,
    borderColor: "#C28E5C",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  containerSelected: {
    borderColor: "#C28E5C",
    borderWidth: 2,
    borderStartWidth: 6,
    backgroundColor: "#FBF6F0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C28E5C",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#C28E5C",
  },
  actionButton: {},
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: "#F9EBEA",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
  },
  guestInfo: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  contactText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
  },
  responseCard: {
    backgroundColor: "#FDFDFD",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    gap: 8,
  },
  responseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  responseLabel: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: "#F0E7DE",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailLabel: {
    flexShrink: 0,
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#8A8A8A",
    lineHeight: 17,
  },
  detailValue: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 17,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  message: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    lineHeight: 16,
  },
  guestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  guestBadgeMuted: {
    backgroundColor: "#F0F0F0",
  },
  guestBadgeHighlight: {
    backgroundColor: "#F5ECE4",
  },
  guestBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_500Medium",
    color: "#9CA3AF",
  },
});

export default GuestListItem;
