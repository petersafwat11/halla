"use client";

import { useCallback, useState, useMemo } from "react";
import {
  useAdminVendors,
  useAdminVendorMutation,
  useAdminVendorsExport,
} from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { normalizeAdminFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import VendorRatingPopup from "./VendorRatingPopup";
import StatusBadge from "./StatusBadge";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import { useRowActions, useBulkActions } from "./useVendorRowActions";
import { formatDate } from "@halaa/shared/utils/locale";
import styles from "./VendorsTable.module.css";

function normalizeVendorData(data) {
  return (data?.data?.vendors || data?.data || []).map((vendor) => ({
    id: vendor.id || vendor._id,
    name: vendor.brandName || vendor.name || "-",
    email: vendor.email || "-",
    phone: vendor.phoneNumber || vendor.phone || "-",
    category: Array.isArray(vendor.serviceCategories) ? vendor.serviceCategories : Object.entries(vendor.serviceCategories || {}).filter(([, values]) => Array.isArray(values) && values.length).map(([key]) => key),
    status: vendor.vendorStatus || vendor.status || "pending",
    rating: vendor.rating ?? vendor.ratingsAverage ?? 0,
    createdAt: vendor.createdAt,
  }));
}

export default function VendorsTable() {
  const { t, i18n } = useTranslation("adminVendors");
  const { t: tDetails } = useTranslation("adminVendorDetails");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("vendors");
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const filters = useMemo(() => normalizeAdminFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading, error } = useAdminVendors(filters);
  const deleteVendor = useAdminVendorMutation("delete");
  const bulkDelete = useAdminVendorMutation("bulkDelete");
  const updateStatus = useAdminVendorMutation("updateStatus");
  const bulkStatus = useAdminVendorMutation("bulkStatus");
  const exportVendors = useAdminVendorsExport();

  const handleDelete = useCallback(async (vendorId) => {
    if (!confirm(t("confirmDelete.message"))) return;
    try {
      await deleteVendor.mutateAsync(vendorId);
      toastUtils.success(t("deleteVendor.success"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "deleteVendor.error" });
    }
  }, [deleteVendor, t]);

  const handleBulkDelete = useCallback(async (ids) => {
    if (!ids?.length) { toastUtils.warning(t("messages.selectRows")); return; }
    if (!confirm(t("messages.confirmBulkDelete", { count: ids.length }))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toastUtils.success(t("messages.bulkDeleteSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.bulkDeleteError" });
    }
  }, [bulkDelete, t]);

  const handleStatusChange = useCallback(async (vendorId, newStatus) => {
    const successKey = newStatus === "approved" ? "approveVendor.success" : "suspendVendor.success";
    const errorKey = newStatus === "approved" ? "approveVendor.error" : "suspendVendor.error";
    try {
      await updateStatus.mutateAsync({ vendorId, status: newStatus });
      toastUtils.success(t(successKey));
    } catch (err) {
      handleError(err, t, { fallbackMessage: errorKey });
    }
  }, [updateStatus, t]);

  const handleBulkApprove = useCallback(async (ids) => {
    if (!ids?.length) { toastUtils.warning(t("messages.selectRows")); return; }
    try {
      await bulkStatus.mutateAsync({ vendorIds: ids, status: "approved" });
      toastUtils.success(t("messages.bulkApproveSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "approveVendor.error" });
    }
  }, [bulkStatus, t]);

  const handleBulkSuspend = useCallback(async (ids) => {
    if (!ids?.length) { toastUtils.warning(t("messages.selectRows")); return; }
    try {
      await bulkStatus.mutateAsync({ vendorIds: ids, status: "suspended" });
      toastUtils.success(t("messages.bulkSuspendSuccess"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "suspendVendor.error" });
    }
  }, [bulkStatus, t]);

  const handleRatingClick = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setShowRatingPopup(true);
  }, []);

  const handleCloseRating = useCallback(() => {
    setShowRatingPopup(false);
    setSelectedVendor(null);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      await exportVendors.mutateAsync({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (err) {
      handleError(err, t, { fallbackMessage: "messages.exportError" });
    }
  }, [exportVendors, filters.search, filters.status, filters.from, filters.to, t]);

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleSearchChange = useCallback((query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleFilterChange = useCallback((statusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const statusTextMap = useMemo(() => ({
    approved: t("table.status.active"),
    pending: t("table.status.pending"),
    rejected: t("table.status.rejected"),
    suspended: t("table.status.suspended"),
  }), [t]);

  const getRowActions = useRowActions({
    canUpdate, canDelete, t, router,
    handleStatusChange, handleRatingClick, handleDelete,
  });

  const bulkActions = useBulkActions({
    canUpdate, canDelete, t,
    handleBulkApprove, handleBulkSuspend, handleBulkDelete,
  });

  const renderCell = useCallback((key, value, row) => {
    if (key === "status") {
      return <StatusBadge status={value} statusTextMap={statusTextMap} />;
    }
    if (key === "rating") {
      return (
        <span
          className={canUpdate ? styles.ratingClickable : ""}
          onClick={() => canUpdate && handleRatingClick(row)}
        >
          {value ? `${value}/5` : t("messages.noRating")}
        </span>
      );
    }
    if (key === "createdAt" && value) {
      return formatDate(value, i18n?.language || "ar");
    }
    if (key === "category") return Array.isArray(value) && value.length ? value.map((category) => tDetails(`categories.${category}`, { defaultValue: category })).join("، ") : "—";
    if (key === "phone" || key === "email") {
      return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{value}</span>;
    }
    return value;
  }, [statusTextMap, canUpdate, handleRatingClick, t, tDetails, i18n.language]);

  const tableData = useMemo(() => normalizeVendorData(data), [data]);

  if (isLoading) return <SimpleLoading />;
  if (error) return <ErrorFallback message={t("errors.loadFailed", "Failed to load vendors")} />;

  return (
    <>
      <div className={styles.container}>
        <Table
          mode="server"
          title={t("table.title")}
          headers={[
            t("table.columns.name"),
            t("table.columns.email"),
            t("table.columns.phoneNumber"),
            t("table.columns.serviceType"),
            t("table.columns.status"),
            t("table.columns.rating"),
            t("messages.createdAt"),
          ]}
          data={tableData}
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          activeFilter={filters.status}
          onFilterChange={handleFilterChange}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canUpdate || canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("dateRange.all"), value: "" },
            { label: t("table.status.active"), value: "approved" },
            { label: t("table.status.pending"), value: "pending" },
            { label: t("table.status.suspended"), value: "suspended" },
          ]}
          pagination={{
            currentPage: parseInt(filters.page, 10) || 1,
            totalPages: data?.data?.pagination?.pages || data?.pagination?.totalPages || 1,
            totalItems: data?.data?.pagination?.total || data?.pagination?.total || 0,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {showRatingPopup && selectedVendor && (
        <VendorRatingPopup vendor={selectedVendor} onClose={handleCloseRating} />
      )}
    </>
  );
}
