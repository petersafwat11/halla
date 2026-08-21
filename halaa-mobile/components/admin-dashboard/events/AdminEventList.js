import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { backgrounds, colors } from "../../../styles/tokens";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useBulkDeleteEvents, useBulkCancelEvents, useExportAdminEvents } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import AdminEventListItem from "./AdminEventListItem";

const EVENT_FILTER_IDS = ["all", "scheduled", "live", "pending_scheduling", "completed", "cancelled"];

const AdminEventList = ({
  events,
  loading,
  onRefresh,
  onEventPress,
  onEdit,
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

  const role  = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);
  const bulkDelete  = useBulkDeleteEvents();
  const bulkCancel  = useBulkCancelEvents();
  const exportEvents = useExportAdminEvents();
  const toast = useToast();

  const filterOptions = useMemo(
    () =>
      EVENT_FILTER_IDS.map((id) => ({
        id,
        label: id === "all" ? t("events.filters.all") : t(`events.filters.${id}`),
      })),
    [t]
  );

  const isServerControlled = Boolean(onSearchQueryChange || onActiveFilterChange || searchQueryProp !== undefined || activeFilterProp !== undefined);

  const filtered = useMemo(() => {
    if (isServerControlled) return events;
    let result = events;
    if (activeFilter !== "all") {
      result = result.filter((e) => e.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.host?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [events, activeFilter, searchQuery, isServerControlled]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filtered.map((e) => e.id || e._id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await exportEvents.mutateAsync({});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkCancel = (ids) => {
    Alert.alert(
      t("events.details.cancel", "Cancel Events"),
      `${t("events.details.cancelConfirm", "Cancel")} ${ids.length} event(s)?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("events.details.cancel", "Cancel Events"),
          style: "destructive",
          onPress: async () => {
            try {
              await bulkCancel.mutateAsync(ids);
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
      `${t("common.delete")} ${ids.length} event(s)? ${t("common.deleteConfirmMessage")}`,
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
      icon: "close-circle-outline",
      label: t("events.details.cancel", "Cancel"),
      color: colors.warning[600],
      bg: "#fff4e0",
      loading: bulkCancel.isPending,
      onPress: handleBulkCancel,
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
        searchPlaceholder={t("events.searchPlaceholder")}
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filtered.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
      <AdminFlatList
        data={filtered}
        keyExtractor={(item) => (item.id || item._id)?.toString()}
        extraData={selectedIds}
        renderItem={({ item }) => {
          const itemId = item.id || item._id;
          return (
            <AdminEventListItem
              event={item}
              onPress={() => onEventPress?.(item)}
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
        emptyIcon="calendar-outline"
        emptyTitle={t("events.empty.title")}
        emptyMessage={
          searchQuery || activeFilter !== "all"
            ? t("common.noSearchResults")
            : t("events.empty.message")
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminEventList;
