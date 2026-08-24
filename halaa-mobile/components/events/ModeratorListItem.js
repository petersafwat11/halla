import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { getStatusVisual } from "../../constants/statusColors";
import { useTranslation } from "../../localization";
import AdaptiveText from "../commen/AdaptiveText";

// Revoked = neutral/inactive status — route badge colors through the shared helper.
const revokedVisual = getStatusVisual("inactive");

/**
 * Long-press menu offers "Revoke access" in addition to edit / delete.
 * The host can revoke a moderator's QR scanner token without removing
 * the moderator from the event roster (delete still removes them entirely).
 *
 * All visible copy is localized; moderator names are adaptive user content
 * and phone digits stay LTR-isolated.
 */
const ModeratorListItem = ({ moderator, onEdit, onDelete, onRevoke }) => {
  const { t } = useTranslation("events");
  const displayName = moderator.name || t("moderatorList.fallback");

  const handleDelete = () => {
    Alert.alert(
      t("moderatorList.deleteConfirmTitle"),
      t("moderatorList.deleteConfirmBody"),
      [
        { text: t("actions.cancel"), style: "cancel" },
        {
          text: t("actions.delete"),
          style: "destructive",
          onPress: () => onDelete && onDelete(moderator),
        },
      ]
    );
  };

  const handleRevoke = () => {
    Alert.alert(
      t("moderatorList.revokeConfirmTitle"),
      t("moderatorList.revokeConfirmBody", { name: displayName,
      }),
      [
        { text: t("actions.cancel"), style: "cancel" },
        {
          text: t("guestList.revokeAccessAction"),
          style: "destructive",
          onPress: () => onRevoke && onRevoke(moderator),
        },
      ]
    );
  };

  const handleLongPress = () => {
    if (!onRevoke) return;
    if (moderator?.isRevoked) {
      Alert.alert(
        t("moderatorList.title"),
        t("moderatorList.alreadyRevoked")
      );
      return;
    }
    Alert.alert(
      displayName,
      t("guestList.chooseAction"),
      [
        ...(onEdit
          ? [{ text: t("actions.edit"), onPress: () => onEdit(moderator) }]
          : []),
        {
          text: t("moderatorList.revokeAction"),
          style: "destructive",
          onPress: handleRevoke,
        },
        ...(onDelete
          ? [
              {
                text: t("moderatorList.deleteAction"),
                style: "destructive",
                onPress: handleDelete,
              },
            ]
          : []),
        { text: t("guestList.close"), style: "cancel" },
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
      {/* Name/phone cluster at the logical start */}
      <View style={styles.startContent}>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <AdaptiveText style={styles.name} numberOfLines={1}>
              {displayName}
            </AdaptiveText>
            {moderator?.isRevoked ? (
              <View style={[styles.revokedBadge, { backgroundColor: revokedVisual.bg }]}>
                <Text style={[styles.revokedBadgeText, { color: revokedVisual.fg }]}>
                  {t("moderatorList.revokedBadge")}
                </Text>
              </View>
            ) : null}
          </View>
          {!!moderator.phone && (
            <Text style={styles.phone}>{isolateLtr(moderator.phone)}</Text>
          )}
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
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  startContent: {
    flexDirection: "row",
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
    flexDirection: "row",
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
  },
  revokedBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_500Medium",
  },
});

export default ModeratorListItem;
