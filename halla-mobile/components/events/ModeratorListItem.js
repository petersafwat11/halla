import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Phase 4 W2-STAFF: long-press menu now offers "Revoke access" in
 * addition to edit / delete. The host can revoke a moderator's QR
 * scanner token without removing the moderator from the event roster
 * (delete still removes them entirely).
 */
const ModeratorListItem = ({ moderator, onEdit, onDelete, onRevoke }) => {
  const handleDelete = () => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد من حذف هذا المشرف؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => onDelete && onDelete(moderator),
      },
    ]);
  };

  const handleRevoke = () => {
    Alert.alert(
      "إلغاء صلاحية الوصول",
      `سيتم إلغاء صلاحية وصول ${moderator.name || "المشرف"} إلى ماسح QR. لن يتمكن من تسجيل دخول الضيوف بعد ذلك.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إلغاء الصلاحية",
          style: "destructive",
          onPress: () => onRevoke && onRevoke(moderator),
        },
      ]
    );
  };

  const handleLongPress = () => {
    if (!onRevoke) return;
    if (moderator?.isRevoked) {
      Alert.alert("المشرف", "تم إلغاء صلاحية هذا المشرف بالفعل.");
      return;
    }
    Alert.alert(
      moderator?.name || "المشرف",
      "اختر إجراء",
      [
        ...(onEdit ? [{ text: "تعديل", onPress: () => onEdit(moderator) }] : []),
        { text: "إلغاء صلاحية الوصول", style: "destructive", onPress: handleRevoke },
        ...(onDelete ? [{ text: "حذف من المناسبة", style: "destructive", onPress: handleDelete }] : []),
        { text: "إغلاق", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onLongPress={handleLongPress}
      delayLongPress={350}
    >
      {/* Crown Icon */}
      <View style={styles.crownContainer}>
        <Ionicons
          name={moderator?.isRevoked ? "shield-outline" : "ribbon-outline"}
          size={24}
          color={moderator?.isRevoked ? "#9CA3AF" : "#C28E5C"}
        />
      </View>
      {/* Left Content */}
      <View style={styles.leftContent}>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{moderator.name || "مشرف"}</Text>
            {moderator?.isRevoked ? (
              <View style={styles.revokedBadge}>
                <Text style={styles.revokedBadgeText}>مُلغى</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.phone}>{moderator.phone || ""}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(moderator)}
          >
            <Ionicons name="create-outline" size={20} color="#C28E5C" />
          </TouchableOpacity>
        )}
        {onRevoke && !moderator?.isRevoked && (
          <TouchableOpacity style={styles.actionButton} onPress={handleRevoke}>
            <Ionicons name="ban-outline" size={20} color="#C28E5C" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#C0392B" />
          </TouchableOpacity>
        )}
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
    flexDirection: "row-reverse",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  leftContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  nameSection: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 4,
  },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  phone: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  crownContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  revokedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#F0F0F0",
  },
  revokedBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_500Medium",
    color: "#9CA3AF",
  },
});

export default ModeratorListItem;
