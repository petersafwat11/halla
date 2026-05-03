import React, { useState, useMemo } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAdminModeratorsInfinite,
  useDebouncedValue,
  useUpdateModeratorStatus,
  useDeleteModerator,
} from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import {
  canEditPage,
  canDeleteOnPage,
  PAGES,
} from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import ModeratorList from "../../components/admin-dashboard/moderators/ModeratorList";
import AddModeratorModal from "../../components/admin-dashboard/moderators/AddModeratorModal";
import { backgrounds } from "../../styles/tokens";

const AdminModeratorsScreen = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.MODERATORS);
  const canDelete = canDeleteOnPage(role, PAGES.MODERATORS);

  // Phase 4 review fix — server-driven filters via the infinite hook.
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const filters = useMemo(
    () => ({ search: debouncedSearch, status: activeFilter }),
    [debouncedSearch, activeFilter]
  );

  const {
    items: moderators,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminModeratorsInfinite(filters);

  const updateStatus = useUpdateModeratorStatus();
  const deleteMod   = useDeleteModerator();

  const [modalVisible,      setModalVisible]      = useState(false);
  const [selectedModerator, setSelectedModerator] = useState(null);
  const [pendingStatusId,   setPendingStatusId]   = useState(null);
  const [pendingDeleteId,   setPendingDeleteId]   = useState(null);

  if (error) toast.error(t("common.error"));

  const handleModeratorPress = (m) => {
    setSelectedModerator(m);
    setModalVisible(true);
  };

  const handleToggleStatus = (m) => {
    const newStatus   = m.status === "active" ? "inactive" : "active";
    const isSuspend   = newStatus === "inactive";
    const actionLabel = isSuspend ? t("common.suspend") : t("common.activate");
    const name        = m.name || m.username || "—";
    Alert.alert(
      actionLabel,
      `${actionLabel} "${name}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: actionLabel,
          style: isSuspend ? "destructive" : "default",
          onPress: async () => {
            const mId = m.id || m._id;
            setPendingStatusId(mId);
            try {
              await updateStatus.mutateAsync({ moderatorId: mId, status: newStatus });
              toast.success(t("common.success"));
              refetch();
            } catch (e) {
              toast.error(e?.message || t("common.error"));
            } finally {
              setPendingStatusId(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = (m) => {
    const name = m.name || m.username || "—";
    Alert.alert(
      t("moderators.delete.title"),
      `${t("moderators.delete.message")} "${name}"? ${t("common.deleteConfirmMessage")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("moderators.delete.confirm"),
          style: "destructive",
          onPress: async () => {
            const mId = m.id || m._id;
            setPendingDeleteId(mId);
            try {
              await deleteMod.mutateAsync(mId);
              toast.success(t("common.success"));
              refetch();
            } catch (e) {
              toast.error(e?.message || t("common.error"));
            } finally {
              setPendingDeleteId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("moderators.title")} showBack />
        <ModeratorList
          moderators={moderators}
          loading={isLoading}
          onRefresh={refetch}
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          onModeratorPress={handleModeratorPress}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          updatePendingId={pendingStatusId}
          deletePendingId={pendingDeleteId}
          canEdit={canEdit}
          canDelete={canDelete}
          onAdd={canEdit ? () => { setSelectedModerator(null); setModalVisible(true); } : undefined}
          addLabel={t("moderators.addModerator")}
        />
        <AddModeratorModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setSelectedModerator(null); }}
          moderator={selectedModerator}
          onSave={() => refetch()}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminModeratorsScreen;
