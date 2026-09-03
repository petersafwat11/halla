import React, { useState, useMemo, useEffect } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  useAdminTicketsInfinite,
  useAssignTicket,
  useBulkDeleteTickets,
  useBulkResolveTickets,
  useDebounce,
  useExportAdminTickets,
  useReopenTicket,
  useResolveTicket,
} from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { useAuthStore } from "../../../stores/authStore";
import { canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import TicketListItem from "../../../components/admin-dashboard/tickets/TicketListItem";
import { ResolveTicketModal, AssignTicketModal } from "../../../components/admin-dashboard/tickets";
import AdminPageHeader from "../../../components/admin-dashboard/common/AdminPageHeader";
import AdminFlatList from "../../../components/admin-dashboard/common/AdminFlatList";
import ExportButton from "../../../components/admin-dashboard/common/ExportButton";
import BulkActionsBar from "../../../components/admin-dashboard/common/BulkActionsBar";
import { backgrounds, colors } from "../../../styles/tokens";

const STATUS_FILTER_IDS = ["all", "open", "in_progress", "waiting_response", "resolved", "closed"];

const AdminTicketsScreen = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const { t } = useTranslation("admin");

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolveModal, setResolveModal] = useState({ visible: false, ticket: null });
  const [assignModal, setAssignModal] = useState({ visible: false, ticket: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const role  = useAuthStore((state) => state.user?.role);
  const exportTickets = useExportAdminTickets();
  const canDelete = canDeleteOnPage(role, PAGES.TICKETS);

  const debouncedSearch = useDebounce(searchQuery, 350);
  const ticketsFilters = useMemo(
    () => ({ search: debouncedSearch, ...(activeFilter !== "all" && { status: activeFilter }) }),
    [debouncedSearch, activeFilter]
  );

  const {
    items: rawTickets,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminTicketsInfinite(ticketsFilters);
  const reopenTicket   = useReopenTicket();
  const bulkDelete     = useBulkDeleteTickets();
  const bulkResolve    = useBulkResolveTickets();

  useEffect(() => {
    if (error) toast.error(t("common.error"));
  }, [error, t, toast]);

  const tickets = useMemo(() =>
    rawTickets.map((tk) => ({
      id:           tk.id,
      ticketNumber: tk.ticketNumber,
      subject:      tk.subject,
      message:      tk.message,
      status:       tk.status || "open",
      priority:     tk.priority || "medium",
      category:     tk.category,
      submittedBy:  tk.user,
      assignedTo:   tk.assignedTo,
      resolution:   tk.resolution,
      createdAt:    tk.createdAt,
      updatedAt:    tk.updatedAt,
    })),
    [rawTickets],
  );

  const filterOptions = useMemo(() => {
    const filterKey = {
      all: "all",
      open: "open",
      in_progress: "inProgress",
      waiting_response: "waitingResponse",
      resolved: "resolved",
      closed: "closed",
    };
    return STATUS_FILTER_IDS.map((id) => ({
      id,
      label: t(`tickets.filters.${filterKey[id]}`),
    }));
  }, [t]);

  const filtered = useMemo(() => {
    let result = tickets;
    if (activeFilter !== "all") result = result.filter((tk) => tk.status === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tk) =>
          tk.subject?.toLowerCase().includes(q) ||
          tk.submittedBy?.name?.toLowerCase().includes(q) ||
          tk.submittedBy?.name?.toLowerCase().includes(q) ||
          tk.ticketNumber?.toString().includes(q),
      );
    }
    return result;
  }, [tickets, activeFilter, searchQuery]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelectedIds(filtered.map((tk) => tk.id).filter(Boolean));

  const clearSelection = () => setSelectedIds([]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExportLoading(true);
      await exportTickets.mutateAsync({});
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkResolve = (ids) => {
    Alert.alert(
      t("tickets.filters.resolved"),
      t("tickets.bulkResolveConfirm", { count: ids.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tickets.filters.resolved"),
          onPress: async () => {
            try {
              await bulkResolve.mutateAsync(ids);
              clearSelection();
              toast.success(t("common.success"));
              refetch();
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
      t("tickets.bulkDeleteConfirm", { count: ids.length }),
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
              refetch();
            } catch {
              toast.error(t("common.error"));
            }
          },
        },
      ],
    );
  };

  const bulkActions = [
    {
      icon: "checkmark-circle-outline",
      label: t("tickets.filters.resolved"),
      color: colors.success[600],
      bg: colors.success[50],
      loading: bulkResolve.isPending,
      onPress: handleBulkResolve,
    },
    canDelete && {
      icon: "trash-outline",
      label: t("common.delete"),
      destructive: true,
      loading: bulkDelete.isPending,
      onPress: handleBulkDelete,
    },
  ].filter(Boolean);

  // ── Individual ticket actions ──────────────────────────────────────────────
  const handleResolve = (ticket) => {
    if (ticket.status === "resolved" || ticket.status === "closed") {
      reopenTicket.mutateAsync(ticket.id)
        .then(() => { toast.success(t("common.success")); refetch(); })
        .catch(() => toast.error(t("common.error")));
    } else {
      setResolveModal({ visible: true, ticket });
    }
  };

  const handleResolveSuccess = () => {
    setResolveModal({ visible: false, ticket: null });
    toast.success(t("common.success"));
    refetch();
  };

  const handleAssignSuccess = () => {
    setAssignModal({ visible: false, ticket: null });
    toast.success(t("common.success"));
    refetch();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("tickets.title")} showBack={true} />

      <View style={styles.container}>
        <AdminPageHeader
          exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("tickets.searchPlaceholder")}
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
          renderItem={({ item }) => (
            <TicketListItem
              ticket={item}
              onPress={() => navigation.navigate("TicketDetails", { ticketId: item.id || item._id })}
              onResolve={handleResolve}
              onAssign={(tk) => setAssignModal({ visible: true, ticket: tk })}
              selected={selectedIds.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
            />
          )}
          loading={isLoading}
          onRefresh={refetch}
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
          emptyIcon="chatbubbles-outline"
          emptyTitle={t("tickets.empty.title")}
          emptyMessage={
            searchQuery || activeFilter !== "all"
              ? t("common.noSearchResults")
              : t("tickets.empty.message")
          }
        />
      </View>

      <ResolveTicketModal
        visible={resolveModal.visible}
        ticket={resolveModal.ticket}
        onClose={() => setResolveModal({ visible: false, ticket: null })}
        onSave={handleResolveSuccess}
      />
      <AssignTicketModal
        visible={assignModal.visible}
        ticket={assignModal.ticket}
        onClose={() => setAssignModal({ visible: false, ticket: null })}
        onSave={handleAssignSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminTicketsScreen;
