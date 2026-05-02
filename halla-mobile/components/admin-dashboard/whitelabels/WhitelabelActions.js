import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import ActionButton from "../common/ActionButton";
import { spacing } from "../../../styles/tokens";

const WhitelabelActions = ({ whitelabel, onUpdateStatus, onUpdateSubscription, onDelete }) => {
  if (!whitelabel) return null;

  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.WHITELABELS);
  const canDelete = canDeleteOnPage(role, PAGES.WHITELABELS);

  const confirmDelete = () => {
    Alert.alert("Delete Whitelabel", "Are you sure you want to delete this whitelabel?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(whitelabel._id) },
    ]);
  };

  const isActive = whitelabel.status === "active";

  return (
    <View style={styles.container}>
      {canEdit && (
        <ActionButton
          label={isActive ? "Suspend" : "Activate"}
          icon={isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
          variant="secondary"
          onPress={() => onUpdateStatus({ whitelabelId: whitelabel._id, status: isActive ? "suspended" : "active" })}
          fullWidth
        />
      )}
      {canEdit && onUpdateSubscription && (
        <ActionButton label="Manage Subscription" icon="card-outline" variant="secondary" onPress={() => onUpdateSubscription(whitelabel)} fullWidth />
      )}
      {canDelete && (
        <ActionButton label="Delete Whitelabel" icon="trash-outline" variant="destructive" onPress={confirmDelete} fullWidth />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16], gap: spacing[12] },
});

export default WhitelabelActions;
