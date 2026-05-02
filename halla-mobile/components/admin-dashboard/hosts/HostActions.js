import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import ActionButton from "../common/ActionButton";
import { spacing } from "../../../styles/tokens";

const HostActions = ({ host, onUpdateStatus, onUpdateSubscription, onSendNotification, onDelete }) => {
  if (!host) return null;

  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.HOSTS);
  const canDelete = canDeleteOnPage(role, PAGES.HOSTS);

  const confirmDelete = () => {
    Alert.alert("Delete Host", "Are you sure you want to delete this host?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(host._id) },
    ]);
  };

  const isActive = host.status === "active";

  return (
    <View style={styles.container}>
      {canEdit && (
        <ActionButton
          label={isActive ? "Suspend" : "Activate"}
          icon={isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
          variant="secondary"
          onPress={() => onUpdateStatus({ hostId: host._id, status: isActive ? "suspended" : "active" })}
          fullWidth
        />
      )}
      {canEdit && onUpdateSubscription && (
        <ActionButton
          label="Manage Subscription"
          icon="card-outline"
          variant="secondary"
          onPress={() => onUpdateSubscription(host)}
          fullWidth
        />
      )}
      {canEdit && onSendNotification && (
        <ActionButton
          label="Send Notification"
          icon="notifications-outline"
          variant="ghost"
          onPress={() => onSendNotification(host)}
          fullWidth
        />
      )}
      {canDelete && (
        <ActionButton
          label="Delete Host"
          icon="trash-outline"
          variant="destructive"
          onPress={confirmDelete}
          fullWidth
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16], gap: spacing[12] },
});

export default HostActions;
