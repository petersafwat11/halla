import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { backgrounds, colors } from "../../../styles/tokens";
import { useBulkDeleteModerators, useBulkSuspendModerators, useExportModerators } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import ModeratorListItem from "./ModeratorListItem";

const FILTER_IDS = ["all", "active", "inactive", "pending"];

const ModeratorList = ({
  moderators,
  loading,
  onRefresh,
  onModeratorPress,
  onToggleStatus,
  onDelete,
  updatePendingId,
  deletePendingId,
  canEdit,
  canDelete,
  onAdd,
  addLabel,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
  activeFilter: activeFilterProp,
  onActiveFilterChange,
}) => {
  const { t } = useTranslation("admin");
  const [searchQueryLocal, setSearchQueryLocal] = useState("");
  const [activeFilterLocal, setActiveFilterLocal] = useState("all");
  const searchQuery = searchQueryProp ?? searchQueryLocal;
  const activeFilter = activeFilterProp ?? activeFilterLocal;
  const setSearchQuery = onSearchQueryChange ?? setSearchQueryLocal;
  const setActiveFilter = onActiveFilterChange ?? setActiveFilterLocal;
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const bulkDelete = useBulkDeleteModerators();
  const bulkSuspend = useBulkSuspendModerators();
  const exportModerators = useExportModerators();
  const toast = useToast();

  const filterOptions = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: id === "all" ? t("moderators.filters.all") : t(`moderators.filters.${id}`),
      })),
    [t]
  );

  const filteredModerators = useMemo(() => {
    let list = moderators;
    if (activeFilter !== "all") {
      list = list.filter((m) => m.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          (m.name || m.username || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [moderators, activeFilter, searchQuery]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filteredModerators.map((m) => m.id || m._id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await exportModerators.mutateAsync({});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkSuspend = (ids) => {
    Alert.alert(
      t("common.suspendConfirmTitle"),
      t("common.bulkSuspendModerators", { count: ids.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.suspend"),
          style: "destructive",
          onPress: async () => {
            try {
              await bulkSuspend.mutateAsync(ids);
              clearSelection();
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const handleBulkDelete = (ids) => {
    Alert.alert(
      t("common.deleteConfirmTitle"),
      t("common.bulkDeleteModerators", { count: ids.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await bulkDelete.mutateAsync(ids);
              clearSelection();
              toast.success(t("common.success"));
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const bulkActions = [
    canEdit && {
      icon: "pause-circle-outline",
      label: t("common.suspend"),
      color: colors.warning[600],
      bg: colors.warning[50],
      loading: bulkSuspend.isPending,
      onPress: handleBulkSuspend,
    },
    canDelete && {
      icon: "trash-outline",
      label: t("common.delete"),
      destructive: true,
      loading: bulkDelete.isPending,
      onPress: handleBulkDelete,
    },
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      <AdminPageHeader
        onAdd={onAdd}
        addLabel={addLabel}
        exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("moderators.searchPlaceholder")}
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filteredModerators.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
      <AdminFlatList
        data={filteredModerators}
        keyExtractor={(item) => String(item.id || item._id || item.email)}
        extraData={selectedIds}
        renderItem={({ item }) => {
          const itemId = item.id || item._id;
          return (
            <ModeratorListItem
              moderator={item}
              onPress={() => onModeratorPress?.(item)}
              onToggleStatus={canEdit ? onToggleStatus : null}
              onDelete={canDelete ? onDelete : null}
              updatePending={updatePendingId === (item.id || item._id)}
              deletePending={deletePendingId === (item.id || item._id)}
              selected={selectedIds.includes(itemId)}
              onSelect={() => toggleSelect(itemId)}
            />
          );
        }}
        loading={loading}
        onRefresh={onRefresh}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        loadingMore={loadingMore}
        emptyIcon="people-outline"
        emptyTitle={t("moderators.empty.title")}
        emptyMessage={
          searchQuery || activeFilter !== "all"
            ? t("common.noSearchResults")
            : t("moderators.empty.message")
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default ModeratorList;
