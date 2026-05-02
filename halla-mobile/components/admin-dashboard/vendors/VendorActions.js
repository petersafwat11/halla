import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import ActionButton from "../common/ActionButton";
import { spacing } from "../../../styles/tokens";

const VendorActions = ({ vendor, onUpdateStatus, onRate, onDelete }) => {
  if (!vendor) return null;

  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.VENDORS);
  const canDelete = canDeleteOnPage(role, PAGES.VENDORS);

  const confirmDelete = () => {
    Alert.alert("Delete Vendor", "Are you sure you want to delete this vendor?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(vendor._id) },
    ]);
  };

  const isActive = vendor.status === "active";
  const isPending = vendor.status === "pending";

  return (
    <View style={styles.container}>
      {canEdit && isPending && (
        <ActionButton
          label="Approve"
          icon="checkmark-circle-outline"
          variant="primary"
          onPress={() => onUpdateStatus({ vendorId: vendor._id, status: "active" })}
          fullWidth
        />
      )}
      {canEdit && isActive && (
        <ActionButton
          label="Suspend"
          icon="pause-circle-outline"
          variant="secondary"
          onPress={() => onUpdateStatus({ vendorId: vendor._id, status: "suspended" })}
          fullWidth
        />
      )}
      {canEdit && !isActive && !isPending && (
        <ActionButton
          label="Activate"
          icon="checkmark-circle-outline"
          variant="secondary"
          onPress={() => onUpdateStatus({ vendorId: vendor._id, status: "active" })}
          fullWidth
        />
      )}
      {canEdit && onRate && (
        <ActionButton
          label="Rate Vendor"
          icon="star-outline"
          variant="ghost"
          onPress={() => onRate(vendor)}
          fullWidth
        />
      )}
      {canDelete && (
        <ActionButton
          label="Delete Vendor"
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

export default VendorActions;
