import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { backgrounds, colors } from "../../../styles/tokens";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useBulkDeleteWhitelabels, useBulkSuspendWhitelabels, useExportWhitelabels } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import WhitelabelListItem from "./WhitelabelListItem";

const FILTER_IDS = ["all", "active", "pending", "suspended"];

const WhitelabelList = ({
  whitelabels = [],
  loading = false,
  onRefresh,
  onWhitelabelPress,
  onManageSub,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  search: searchProp,
  onSearchChange,
  activeFilter: activeFilterProp,
  onActiveFilterChange,
}) => {
  const { t } = useTranslation("admin");
  const [searchLocal, setSearchLocal] = useState("");
  const [activeFilterLocal, setActiveFilterLocal] = useState("all");
  const search = searchProp ?? searchLocal;
  const activeFilter = activeFilterProp ?? activeFilterLocal;
  const setSearch = onSearchChange ?? setSearchLocal;
  const setActiveFilter = onActiveFilterChange ?? setActiveFilterLocal;
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const role  = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.WHITELABELS);
  const canDelete = canDeleteOnPage(role, PAGES.WHITELABELS);
  const bulkDelete  = useBulkDeleteWhitelabels();
  const bulkSuspend = useBulkSuspendWhitelabels();
  const exportWhitelabels = useExportWhitelabels();
  const toast = useToast();

  const filterOptions = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: id === "all" ? t("whitelabels.filters.all") : t(`whitelabels.status.${id}`),
      })),
    [t]
  );

  const filtered = useMemo(() => {
    let list = whitelabels;
    if (activeFilter !== "all") {
      list = list.filter((w) => w.status === activeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) =>
          (w.name || "").toLowerCase().includes(q) ||
          (w.username || "").toLowerCase().includes(q) ||
          (w.email || "").toLowerCase().includes(q) ||
          (w.domain || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [whitelabels, search, activeFilter]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filtered.map((w) => w._id || w.id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await exportWhitelabels.mutateAsync({});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkSuspend = (ids) => {
    Alert.alert(
      t("whitelabels.actions.suspend"),
      t("whitelabels.actions.bulkSuspendMessage", { count: ids.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("whitelabels.actions.suspend"),
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
      t("whitelabels.actions.bulkDeleteMessage", { count: ids.length }),
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
      icon: "ban-outline",
      label: t("whitelabels.actions.suspend"),
      color: colors.warning[500],
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
        exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("whitelabels.searchPlaceholder")}
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
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        extraData={selectedIds}
        renderItem={({ item }) => {
          const itemId = item._id || item.id;
          return (
            <WhitelabelListItem
              whitelabel={item}
              onPress={() => onWhitelabelPress?.(item)}
              onManageSub={onManageSub ? () => onManageSub(item) : undefined}
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
        emptyIcon="business-outline"
        emptyTitle={t("whitelabels.empty.title")}
        emptyMessage={
          search || activeFilter !== "all"
            ? t("common.noSearchResults")
            : t("whitelabels.empty.message")
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default WhitelabelList;
