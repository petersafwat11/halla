import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import ActionButton from "../common/ActionButton";
import { spacing } from "../../../styles/tokens";

const EventActions = ({ event, onUpdateStatus, onDelete }) => {
  if (!event) return null;

  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);

  const confirmDelete = () => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(event._id) },
    ]);
  };

  const status = event.status;

  return (
    <View style={styles.container}>
      {canEdit && status !== "completed" && status !== "cancelled" && (
        <ActionButton
          label="Mark Completed"
          icon="checkmark-done-outline"
          variant="primary"
          onPress={() => onUpdateStatus({ eventId: event._id, status: "completed" })}
          fullWidth
        />
      )}
      {canEdit && status !== "cancelled" && status !== "completed" && (
        <ActionButton
          label="Cancel Event"
          icon="close-circle-outline"
          variant="secondary"
          onPress={() => onUpdateStatus({ eventId: event._id, status: "cancelled" })}
          fullWidth
        />
      )}
      {canEdit && (status === "cancelled" || status === "completed") && (
        <ActionButton
          label="Reopen as Scheduled"
          icon="refresh-outline"
          variant="secondary"
          onPress={() => onUpdateStatus({ eventId: event._id, status: "scheduled" })}
          fullWidth
        />
      )}
      {canDelete && (
        <ActionButton
          label="Delete Event"
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

export default EventActions;
