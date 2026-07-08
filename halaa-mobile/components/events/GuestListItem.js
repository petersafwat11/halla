import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStatusVisual } from "../../constants/statusColors";

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
  const getStatusStyle = (status) => {
    // Backend RSVP default (no response) → treat as "invited" for the tone.
    switch (status) {
      case "confirmed":
      case "checked_in":
        return { ...getStatusVisual(status), label: "سأحضر" };
      case "declined":
        return { ...getStatusVisual("declined"), label: "اعتذر" };
      case "maybe":
        return { ...getStatusVisual("maybe"), label: "ربما" };
      default:
        return { ...getStatusVisual("invited"), label: "لم يرد" };
    }
  };

  const statusStyle = getStatusStyle(guest.status);

  const handleRotateQr = () => {
    if (!onRotateQr) return;
    Alert.alert(
      "تحديث رمز الدخول",
      `سيتم إنشاء رمز QR جديد لـ ${guest.name || "الضيف"}. الرمز القديم سيتوقف عن العمل فوراً.`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تحديث", style: "destructive", onPress: () => onRotateQr(guest) },
      ]
    );
  };

  const handleRevokeAccess = () => {
    if (!onRevokeAccess) return;
    Alert.alert(
      "إلغاء صلاحية الوصول لمحتوى ما بعد المناسبة",
      `سيتم إلغاء صلاحية ${guest.name || "الضيف"} لعرض الصور والتعليقات بعد المناسبة. لإعادة منح صلاحية الدخول، استخدم "تحديث رمز الدخول" بدلاً من ذلك.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إلغاء الصلاحية",
          style: "destructive",
          onPress: () => onRevokeAccess(guest),
        },
      ]
    );
  };

  const handleLongPress = () => {
    const options = [];
    if (onEdit) options.push({ text: "تعديل بيانات الضيف", onPress: () => onEdit(guest) });
    if (onRotateQr) options.push({ text: "تحديث رمز QR", style: "destructive", onPress: handleRotateQr });
    if (onRevokeAccess) options.push({ text: "إلغاء صلاحية محتوى ما بعد المناسبة", style: "destructive", onPress: handleRevokeAccess });
    if (onDelete) options.push({ text: "حذف الضيف", style: "destructive", onPress: () => onDelete(guest) });
    if (options.length === 0) return;
    Alert.alert(guest?.name || "الضيف", "اختر إجراء", [
      ...options,
      { text: "إغلاق", style: "cancel" },
    ]);
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
            <Text style={styles.name}>{guest.name || "ضيف"}</Text>
            {guest?.accessRevoked ? (
              <View style={[styles.guestBadge, styles.guestBadgeMuted]}>
                <Text style={styles.guestBadgeText}>صلاحية مُلغاة</Text>
              </View>
            ) : guest?.qrRotated ? (
              <View style={[styles.guestBadge, styles.guestBadgeHighlight]}>
                <Text style={styles.guestBadgeText}>QR محدّث</Text>
              </View>
            ) : null}
          </View>

          {!!guest.phone && (
            <Text style={styles.contactText}>{guest.phone}</Text>
          )}
        </View>

        <View style={styles.actions}>
          {selectable ? (
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
              {selected ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit?.(guest)}
                activeOpacity={0.7}
              >
                <View style={styles.editButton}>
                  <Ionicons name="create-outline" size={16} color="#6B4E33" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDelete?.(guest)}
                activeOpacity={0.7}
              >
                <View style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={16} color="#C0392B" />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Response */}
      <View style={styles.responseCard}>
        <View style={styles.responseRow}>
          <Text style={styles.responseLabel}>حالة الردود</Text>
          <Text style={styles.responseDate}>{guest.responseDate || "لم يرد بعد"}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.fg }]}>
            {statusStyle.label}
          </Text>
        </View>
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
    borderEndWidth: 6,
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
    borderEndWidth: 6,
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
    gap: 4,
  },
  responseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  responseDate: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  responseLabel: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16,
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
