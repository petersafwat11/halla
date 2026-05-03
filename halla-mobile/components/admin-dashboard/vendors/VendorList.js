import React, { useState, useMemo } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { backgrounds, colors } from "../../../styles/tokens";
import { useAuthStore } from "../../../stores/authStore";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import { useBulkDeleteVendors, useBulkApproveVendors, useBulkSuspendVendors } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import adminDashboardService from "../../../services/adminDashboardService";
import AdminPageHeader from "../common/AdminPageHeader";
import AdminFlatList from "../common/AdminFlatList";
import ExportButton from "../common/ExportButton";
import BulkActionsBar from "../common/BulkActionsBar";
import VendorListItem from "./VendorListItem";

const FILTER_IDS = ["all", "approved", "pending", "rejected", "suspended"];

const VendorList = ({
  vendors = [],
  onVendorPress,
  onRate,
  loading = false,
  onRefresh,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  // Phase 4 review fix — controlled filter props from the screen so
  // server-side filtering re-keys the infinite query on change.
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

  const token = useAuthStore((state) => state.token);
  const role  = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.VENDORS);
  const canDelete = canDeleteOnPage(role, PAGES.VENDORS);
  const bulkDelete  = useBulkDeleteVendors();
  const bulkApprove = useBulkApproveVendors();
  const bulkSuspend = useBulkSuspendVendors();
  const toast = useToast();

  const getFilterLabel = (id) => {
    const map = {
      all:       t("vendors.filters.all"),
      approved:  t("vendors.status.active"),
      pending:   t("vendors.status.pending"),
      rejected:  t("vendors.status.inactive"),
      suspended: t("vendors.status.suspended"),
    };
    return map[id] || id;
  };

  // Phase 4 review: counts dropped (misleading under pagination).
  const filterOptions = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: getFilterLabel(id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const filteredVendors = useMemo(() => {
    let result = vendors;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.brandName?.toLowerCase().includes(q) ||
          v.vendorData?.brandName?.toLowerCase().includes(q) ||
          v.username?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.vendorData?.email?.toLowerCase().includes(q),
      );
    }
    if (activeFilter !== "all") {
      result = result.filter((v) => (v.vendorStatus || v.status) === activeFilter);
    }
    return result;
  }, [vendors, searchQuery, activeFilter]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filteredVendors.map((v) => v._id || v.id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await adminDashboardService.vendors.export(token);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkApprove = (ids) => {
    Alert.alert(
      t("common.approve"),
      `${t("common.approve")} ${ids.length} vendor(s)?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.approve"),
          onPress: async () => {
            try {
              await bulkApprove.mutateAsync(ids);
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

  const handleBulkSuspend = (ids) => {
    Alert.alert(
      t("vendors.details.suspend"),
      `Suspend ${ids.length} vendor(s)?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("vendors.details.suspend"),
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
      `${t("common.delete")} ${ids.length} vendor(s)? ${t("common.deleteConfirmMessage")}`,
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
      icon: "checkmark-circle-outline",
      label: t("common.approve"),
      color: colors.success[600],
      bg: colors.success[50],
      loading: bulkApprove.isPending,
      onPress: handleBulkApprove,
    },
    canEdit && {
      icon: "ban-outline",
      label: t("vendors.details.suspend"),
      color: colors.warning[500],
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
        exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("vendors.searchPlaceholder")}
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <BulkActionsBar
        selectedIds={selectedIds}
        totalCount={filteredVendors.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
      <AdminFlatList
        data={filteredVendors}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        extraData={selectedIds}
        renderItem={({ item }) => {
          const itemId = item._id || item.id;
          return (
            <VendorListItem
              vendor={item}
              onPress={() => onVendorPress?.(item)}
              onRate={onRate}
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
        emptyIcon="storefront-outline"
        emptyTitle={t("vendors.empty.title")}
        emptyMessage={
          searchQuery || activeFilter !== "all"
            ? t("common.noSearchResults")
            : t("vendors.empty.message")
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default VendorList;
