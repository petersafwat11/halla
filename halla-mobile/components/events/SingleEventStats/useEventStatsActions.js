import { useCallback, useState } from "react";
import { Alert } from "react-native";
import {
  useAddGuest,
  useUpdateGuest,
  useDeleteGuest,
  useRotateGuestQr,
  useRevokeGuestAccess,
  useExportGuests,
} from "../../../hooks/mutations/useGuestMutations";
import {
  addStaff,
  updateStaff,
  deleteStaff,
  revokeStaffAccess,
} from "../../../services/eventsService2";
import { saveBlobAndShare } from "../../../utils/download";

/**
 * Encapsulates the mutation calls + optimistic-flag bookkeeping that the
 * guest / staff lists need. The flag-rollback semantics on failure are
 * preserved verbatim from the pre-split component so the badge UX stays
 * identical.
 */
export const useEventStatsActions = ({
  event,
  t,
  onRefresh,
  refreshStaffTokens,
  setGuestActions,
  setStaffActions,
  setEditingItem,
  setShowPopup,
}) => {
  const eventId = event?._id || event?.id;
  const addGuestMut = useAddGuest();
  const updateGuestMut = useUpdateGuest();
  const deleteGuestMut = useDeleteGuest();
  const rotateGuestQrMut = useRotateGuestQr();
  const revokeGuestAccessMut = useRevokeGuestAccess();
  const exportGuestsMut = useExportGuests();

  const [popupLoading, setPopupLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Roll back an optimistic flag on a guest/staff action failure.
  const _rollbackFlag = (setter, id, key) =>
    setter((prev) => {
      const next = { ...prev };
      const slot = { ...(next[id] || {}) };
      delete slot[key];
      if (Object.keys(slot).length === 0) delete next[id];
      else next[id] = slot;
      return next;
    });

  const handlePopupSave = useCallback(
    async ({ activeTab, editingItem, data }) => {
      try {
        setPopupLoading(true);
        if (activeTab === "guests") {
          if (editingItem) {
            await updateGuestMut.mutateAsync({
              eventId,
              guestId: editingItem.id,
              data,
            });
            Alert.alert(
              t("guest.alerts.successTitle"),
              t("guest.alerts.updateSuccess")
            );
          } else {
            await addGuestMut.mutateAsync({ eventId, data });
            Alert.alert(
              t("guest.alerts.successTitle"),
              t("guest.alerts.addSuccess")
            );
          }
        } else if (editingItem) {
          await updateStaff(eventId, editingItem.id, data);
          Alert.alert(
            t("guest.alerts.successTitle"),
            t("guest.alerts.staffUpdateSuccess")
          );
        } else {
          await addStaff(eventId, data);
          Alert.alert(
            t("guest.alerts.successTitle"),
            t("guest.alerts.staffAddSuccess")
          );
        }
        setShowPopup(false);
        setEditingItem(null);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error saving:", error);
        Alert.alert(
          t("guest.alerts.errorTitle"),
          error.message || t("guest.alerts.saveError")
        );
      } finally {
        setPopupLoading(false);
      }
    },
    [
      addGuestMut,
      updateGuestMut,
      eventId,
      onRefresh,
      setEditingItem,
      setShowPopup,
      t,
    ]
  );

  const handleGuestEdit = useCallback(
    (guest) => {
      setEditingItem(guest);
      setShowPopup(true);
    },
    [setEditingItem, setShowPopup]
  );

  const handleGuestDelete = useCallback(
    (guest) => {
      Alert.alert(
        t("guest.alerts.deleteConfirmTitle"),
        t("guest.alerts.deleteConfirmBody"),
        [
          { text: t("guest.alerts.cancel"), style: "cancel" },
          {
            text: t("guest.alerts.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteGuestMut.mutateAsync({ eventId, guestId: guest.id });
                Alert.alert(
                  t("guest.alerts.successTitle"),
                  t("guest.alerts.deleteSuccess")
                );
                if (onRefresh) onRefresh();
              } catch (error) {
                console.error("Error deleting guest:", error);
                Alert.alert(
                  t("guest.alerts.errorTitle"),
                  error.message || t("guest.alerts.deleteError")
                );
              }
            },
          },
        ]
      );
    },
    [deleteGuestMut, eventId, onRefresh, t]
  );

  const handleGuestRotateQr = useCallback(
    async (guest) => {
      setGuestActions((prev) => ({
        ...prev,
        [guest.id]: { ...prev[guest.id], qrRotated: true },
      }));
      try {
        const result = await rotateGuestQrMut.mutateAsync({
          eventId,
          guestId: guest.id,
        });
        Alert.alert(
          t("guest.alerts.successTitle"),
          result?.qrUrl
            ? t("guest.alerts.qrRotatedNew")
            : t("guest.alerts.qrUpdated")
        );
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error rotating QR:", error);
        _rollbackFlag(setGuestActions, guest.id, "qrRotated");
        Alert.alert(
          t("guest.alerts.errorTitle"),
          error.message || t("guest.alerts.qrRotateError")
        );
      }
    },
    [rotateGuestQrMut, eventId, onRefresh, setGuestActions, t]
  );

  const handleGuestRevokeAccess = useCallback(
    async (guest) => {
      setGuestActions((prev) => ({
        ...prev,
        [guest.id]: { ...prev[guest.id], accessRevoked: true },
      }));
      try {
        await revokeGuestAccessMut.mutateAsync({ eventId, guestId: guest.id });
        Alert.alert(
          t("guest.alerts.successTitle"),
          t("guest.alerts.accessRevokedSuccess")
        );
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error revoking guest access:", error);
        _rollbackFlag(setGuestActions, guest.id, "accessRevoked");
        Alert.alert(
          t("guest.alerts.errorTitle"),
          error.message || t("guest.alerts.accessRevokeError")
        );
      }
    },
    [revokeGuestAccessMut, eventId, onRefresh, setGuestActions, t]
  );

  const handleModeratorEdit = useCallback(
    (moderator) => {
      setEditingItem(moderator);
      setShowPopup(true);
    },
    [setEditingItem, setShowPopup]
  );

  const handleModeratorDelete = useCallback(
    async (moderator) => {
      try {
        await deleteStaff(eventId, moderator.id);
        Alert.alert(
          t("guest.alerts.successTitle"),
          t("guest.alerts.staffDeleteSuccess")
        );
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error deleting moderator:", error);
        Alert.alert(
          t("guest.alerts.errorTitle"),
          error.message || t("guest.alerts.staffDeleteError")
        );
      }
    },
    [eventId, onRefresh, t]
  );

  const handleModeratorRevoke = useCallback(
    async (moderator) => {
      setStaffActions((prev) => ({
        ...prev,
        [moderator.id]: { ...prev[moderator.id], revoked: true },
      }));
      try {
        const result = await revokeStaffAccess(eventId, moderator.id);
        if (result?.wasAlreadyRevoked) {
          Alert.alert(
            t("guest.alerts.successTitle"),
            t("guest.alerts.staffRevokeAlready")
          );
        } else {
          Alert.alert(
            t("guest.alerts.successTitle"),
            t("guest.alerts.staffRevokeSuccess")
          );
        }
        if (refreshStaffTokens) refreshStaffTokens();
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error revoking moderator:", error);
        _rollbackFlag(setStaffActions, moderator.id, "revoked");
        Alert.alert(
          t("guest.alerts.errorTitle"),
          error.message || t("guest.alerts.staffRevokeError")
        );
      }
    },
    [eventId, onRefresh, refreshStaffTokens, setStaffActions, t]
  );

  const handleExportGuests = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportGuestsMut.mutateAsync({ eventId });
      if (!result?.blob) throw new Error("Empty export response");
      const share = await saveBlobAndShare(
        result.blob,
        result.filename || `event-${eventId}-guests.xlsx`,
        { dialogTitle: t("guest.alerts.exportDialogTitle") }
      );
      if (!share.success && share.message) {
        Alert.alert(t("guest.alerts.exportTitle"), share.message);
      }
    } catch (error) {
      console.error("[SingleEventStats] export failed:", error);
      Alert.alert(
        t("guest.alerts.exportTitle"),
        error.message || t("guest.alerts.exportError")
      );
    } finally {
      setExporting(false);
    }
  }, [exportGuestsMut, eventId, exporting, t]);

  return {
    popupLoading,
    exporting,
    handlePopupSave,
    handleGuestEdit,
    handleGuestDelete,
    handleGuestRotateQr,
    handleGuestRevokeAccess,
    handleModeratorEdit,
    handleModeratorDelete,
    handleModeratorRevoke,
    handleExportGuests,
  };
};

export default useEventStatsActions;
