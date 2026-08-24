import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { formatCount } from "@halaa/shared/utils/locale";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { backgrounds, colors } from "../../../styles/tokens";
import { useAuthStore } from "../../../stores/authStore";
import { canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useBulkDeleteHosts } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useExportHosts } from "../../../hooks/admin";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import HostListItem from "./HostListItem";

const HostList = ({
  hosts,
  onHostPress,
  onManageSubscription,
  loading = false,
  onRefresh,
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
  const { t, currentLanguage } = useTranslation("admin");
  const [searchQueryLocal, setSearchQueryLocal] = useState("");
  const [activeFilterLocal, setActiveFilterLocal] = useState("all");
  const searchQuery = searchQueryProp ?? searchQueryLocal;
  const activeFilter = activeFilterProp ?? activeFilterLocal;
  const setSearchQuery = onSearchQueryChange ?? setSearchQueryLocal;
  const setActiveFilter = onActiveFilterChange ?? setActiveFilterLocal;
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const role  = useAuthStore((state) => state.user?.role);
  const canDelete = canDeleteOnPage(role, PAGES.HOSTS);
  const bulkDelete = useBulkDeleteHosts();
  const exportHosts = useExportHosts();
  const toast = useToast();

  const filterOptions = useMemo(() => [
    { id: "all",       label: t("hosts.filters.all") },
    { id: "active",    label: t("hosts.filters.active") },
    { id: "suspended", label: t("hosts.filters.suspended") },
    { id: "pending",   label: t("hosts.filters.pending") },
  ], [t]);

  const isServerControlled = Boolean(onSearchQueryChange || onActiveFilterChange || searchQueryProp !== undefined || activeFilterProp !== undefined);

  const filteredHosts = useMemo(() => {
    if (isServerControlled) return hosts;
    let result = hosts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.name?.toLowerCase().includes(q) ||
          h.email?.toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "all") {
      result = result.filter((h) => h.status === activeFilter);
    }
    return result;
  }, [hosts, searchQuery, activeFilter, isServerControlled]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filteredHosts.map((h) => h.id || h._id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await exportHosts.mutateAsync({});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkDelete = (ids) => {
    Alert.alert(
      t("hosts.deleteConfirm.bulkTitle", {
        // Isolate the count so parentheses cannot flip in the Arabic title.
        count: isolateAuto(formatCount(ids.length, currentLanguage)),
      }),
      t("hosts.deleteConfirm.bulkMessage"),
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
        searchPlaceholder={t("hosts.searchPlaceholder")}
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filteredHosts.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
      <AdminFlatList
        data={filteredHosts}
        keyExtractor={(item) => (item.id || item._id)?.toString()}
        extraData={selectedIds}
        renderItem={({ item }) => {
          const itemId = item.id || item._id;
          return (
            <HostListItem
              host={item}
              onPress={() => onHostPress(item)}
              onManageSubscription={onManageSubscription ? () => onManageSubscription(item) : undefined}
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
        emptyTitle={t("hosts.empty.title")}
        emptyMessage={
          searchQuery || activeFilter !== "all"
            ? t("common.noSearchResults")
            : t("hosts.empty.message")
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default HostList;
