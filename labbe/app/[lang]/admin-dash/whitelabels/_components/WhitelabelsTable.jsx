"use client";

import { useCallback, useState } from "react";
import { useAdminWhitelabels } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { FiEye, FiCheckCircle, FiSlash, FiCreditCard, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import SubscriptionAssignmentPopup from "../../_components/SubscriptionAssignmentPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useWhitelabelTableActions } from "./useWhitelabelTableActions";
import { getLocalized } from "@/utils/locale";
import styles from "./WhitelabelsTable.module.css";

export default function WhitelabelsTable() {
  const { t, i18n } = useTranslation("adminWhitelabels");
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [selectedWhitelabel, setSelectedWhitelabel] = useState(null);

  const {
    filters, canUpdate, canDelete,
    handleDelete, handleBulkDelete, handleStatusChange,
    handleExport, handlePageChange, data, router,
  } = useWhitelabelTableActions();

  const { data: queryData, isLoading, isError } = useAdminWhitelabels(filters);
  const mergedData = queryData || data;

  const handleSubscriptionClick = useCallback((whitelabel) => {
    setSelectedWhitelabel(whitelabel);
    setShowSubscriptionPopup(true);
  }, []);

  const handleCloseSubscriptionPopup = useCallback(() => {
    setShowSubscriptionPopup(false);
    setSelectedWhitelabel(null);
  }, []);

  const statusClassMap = {
    active: styles.statusActive,
    pending: styles.statusPending,
    suspended: styles.statusSuspended,
  };

  const statusTextMap = {
    active: t("status.active"),
    pending: t("status.pending"),
    suspended: t("status.suspended"),
  };

  const getRowActions = useCallback((row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("actions.viewDetails"),
        onClick: (r) => router.push(`/admin-dash/whitelabels/${r.id}`),
      },
    ];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended" ? t("actions.activate") : t("actions.suspend"),
        onClick: (r) => handleStatusChange(r.id, r.status === "suspended" ? "active" : "suspended"),
      });
      actions.push({
        type: "dropdown",
        icon: <FiCreditCard size={16} />,
        text: t("actions.managePlan"),
        onClick: (r) => {
          const wl = (mergedData?.data?.whitelabels || mergedData?.data || []).find(
            (w) => (w.id || w._id) === r.id
          );
          if (wl) handleSubscriptionClick({ ...r, ...wl });
        },
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("actions.delete"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  }, [canUpdate, canDelete, mergedData, t, router, handleStatusChange, handleSubscriptionClick, handleDelete]);

  const bulkActions = canDelete
    ? [{ icon: <FiTrash2 size={16} />, text: t("bulkActions.delete"), onClick: (ids) => handleBulkDelete(ids) }]
    : [];

  const renderCell = useCallback((key, value, row) => {
    if (key === "status") {
      const colorClass = statusClassMap[value] || styles.statusActive;
      return (
        <div
          className={`${styles.statusBadge} ${colorClass} ${canUpdate ? styles.clickable : ""}`}
          onClick={() => { if (canUpdate) handleStatusChange(row.id, value === "active" ? "suspended" : "active"); }}
        >
          <span>{statusTextMap[value] || value}</span>
        </div>
      );
    }

    if (key === "subscription") {
      return (
        <span className={canUpdate ? styles.subscriptionClickable : ""} onClick={() => canUpdate && handleSubscriptionClick(row)}>
          {value || t("messages.noSubscription")}
        </span>
      );
    }

    if (key === "createdAt" && value) return new Date(value).toLocaleDateString();
    if (key === "phone") {
      return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{value}</span>;
    }
    return value;
  }, [canUpdate, statusClassMap, statusTextMap, handleStatusChange, handleSubscriptionClick, t]);

  const tableData = (mergedData?.data?.whitelabels || mergedData?.data || []).map((wl) => ({
    id: wl.id || wl._id,
    name: wl.username || wl.name || "-",
    email: wl.email || "-",
    phone: wl.phoneNumber || wl.phone || "-",
    domain: wl.domain || "-",
    status: wl.status || "active",
    subscription: getLocalized(wl.subscription?.plan, "name", i18n.language) || wl.subscription?.planCode || "-",
    createdAt: wl.createdAt || wl.created_at,
  }));

  if (isLoading) return <SimpleLoading />;
  if (isError) return <div className={styles.error}>{t("errors.loadFailed", "Failed to load data")}</div>;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("table.title")}
          headers={[
            t("table.columns.companyName"),
            t("table.columns.email"),
            t("messages.phone"),
            t("messages.domain"),
            t("table.columns.status"),
            t("messages.subscription"),
            t("table.columns.createdAt"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("dateRange.all"), value: "" },
            { label: t("status.active"), value: "active" },
            { label: t("status.pending"), value: "pending" },
            { label: t("status.suspended"), value: "suspended" },
          ]}
          pagination={{
            currentPage: parseInt(filters.page),
            totalPages: mergedData?.data?.pagination?.pages || mergedData?.pagination?.totalPages || 1,
            totalItems: mergedData?.data?.pagination?.total || mergedData?.pagination?.total || 0,
            onPageChange: handlePageChange,
          }}
        />
      </div>

      {showSubscriptionPopup && selectedWhitelabel && (
        <SubscriptionAssignmentPopup
          entity={selectedWhitelabel}
          entityType="whitelabel"
          onClose={handleCloseSubscriptionPopup}
        />
      )}
    </>
  );
}
