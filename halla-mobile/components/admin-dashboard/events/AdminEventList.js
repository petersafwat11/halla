import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { backgrounds, colors } from "../../../styles/tokens";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useBulkDeleteEvents, useBulkSuspendEvents } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import adminDashboardService from "../../../services/adminDashboardService";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import AdminEventListItem from "./AdminEventListItem";

const EVENT_FILTER_IDS = ["all", "scheduled", "live", "draft", "completed", "cancelled", "suspended"];

const AdminEventList = ({ events, loading, onRefresh, onEventPress, onAdd, addLabel }) => {
  const { t } = useTranslation("admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const token = useAuthStore((state) => state.token);
  const role  = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);
  const bulkDelete  = useBulkDeleteEvents();
  const bulkSuspend = useBulkSuspendEvents();
  const toast = useToast();

  const filterOptions = useMemo(() => {
    const getCount = (id) =>
      id === "all" ? events.length : events.filter((e) => e.status === id).length;
    return EVENT_FILTER_IDS.map((id) => ({
      id,
      label: id === "all" ? t("events.filters.all") : t(`events.filters.${id}`),
      count: getCount(id),
    }));
  }, [events, t]);

  const filtered = useMemo(() => {
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
  }, [events, activeFilter, searchQuery]);

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
      await adminDashboardService.events.export(token);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkSuspend = (ids) => {
    Alert.alert(
      t("events.details.suspend"),
      `${t("events.details.suspend")} ${ids.length} event(s)?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("events.details.suspend"),
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
      icon: "pause-circle-outline",
      label: t("events.details.suspend"),
      color: colors.warning[600],
      bg: "#fff4e0",
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
