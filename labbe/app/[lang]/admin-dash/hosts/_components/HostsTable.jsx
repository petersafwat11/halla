"use client";

import { useAdminHosts, useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEye, FiCheckCircle, FiSlash, FiCreditCard, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { hostsAPI } from "@/services/adminDashboard";
import AddHostPopup from "./AddHostPopup";
import SubscriptionAssignmentPopup from "../../_components/SubscriptionAssignmentPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./HostsTable.module.css";

export default function HostsTable({ showAddPopup: externalShowAdd, setShowAddPopup: externalSetShowAdd }) {
  const { t } = useTranslation("adminHosts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("hosts");
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const showAddPopup = externalShowAdd !== undefined ? externalShowAdd : internalShowAdd;
  const setShowAddPopup = externalSetShowAdd || setInternalShowAdd;
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminHosts(filters);
  const deleteHost = useAdminHostMutation("delete");
  const bulkDelete = useAdminHostMutation("bulkDelete");
  const updateStatus = useAdminHostMutation("updateStatus");

  const handleDelete = async (hostId) => {
    if (!confirm(t("confirmDelete.message", "Are you sure you want to delete this host?"))) return;
    try {
      await deleteHost.mutateAsync(hostId);
      toastUtils.success(t("deleteHost.success", "Host deleted successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) {
      toastUtils.warning(t("table.selectRows", "Please select hosts to delete"));
      return;
    }
    if (!confirm(t("confirmDelete.message", "Are you sure you want to delete these hosts?"))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toastUtils.success(t("deleteHost.success", "Hosts deleted successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleStatusChange = async (hostId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ hostId, status: newStatus });
      toastUtils.success(t("actions.suspendSuccess", "Status updated successfully"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleSubscriptionClick = (host) => { setSelectedHost(host); setShowSubscriptionPopup(true); };

  const handleExport = async () => {
    try {
      await hostsAPI.export({ search: filters.search, status: filters.status, from: filters.from, to: filters.to });
    } catch (error) {
      handleError(error, t);
    }
  };

  const getRowActions = (row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("hosts.viewDetails", "عرض التفاصيل"),
        onClick: (r) => router.push(`/admin-dash/hosts/${r.id}`),
      },
    ];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended"
          ? t("hosts.activate", "تفعيل")
          : t("hosts.suspend", "إيقاف"),
        onClick: (r) => handleStatusChange(r.id, r.status === "suspended" ? "active" : "suspended"),
      });
      actions.push({
        type: "dropdown",
        icon: <FiCreditCard size={16} />,
        text: t("hosts.subscription", "الاشتراك"),
        onClick: (r) => {
          const host = (data?.data?.hosts || []).find(h => (h.id || h._id) === r.id);
          if (host) handleSubscriptionClick({ ...r, ...host });
        },
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("hosts.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("hosts.bulkDelete", "حذف المحدد"),
      onClick: (ids) => handleBulkDelete(ids),
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        active: { bg: "#EAF4EF", color: "#2A8C5B", text: t("status.active", "Active") },
        pending: { bg: "#FBF3E6", color: "#D38200", text: t("hostDetails.pending", "Pending") },
        suspended: { bg: "#F9EBEA", color: "#C0392B", text: t("status.suspended", "Suspended") },
      };
      const config = statusConfig[value] || statusConfig.active;
      return (
        <div
          className={`${styles.statusBadge} ${canUpdate ? styles.statusBadgeClickable : styles.statusBadgeReadonly}`}
          style={{ background: config.bg }}
          onClick={() => {
            if (!canUpdate) return;
            const newStatus = value === "active" ? "suspended" : "active";
            handleStatusChange(row.id, newStatus);
          }}
        >
          <span className={styles.statusBadgeText} style={{ color: config.color }}>
            {config.text}
          </span>
        </div>
      );
    }

    if (key === "subscription") {
      return (
        <span
          className={canUpdate ? styles.linkCell : styles.plainCell}
          onClick={() => canUpdate && handleSubscriptionClick(row)}
        >
          {value || t("hostDetails.noLocation", "—")}
        </span>
      );
    }

    if (key === "createdAt" && value) {
      return new Date(value).toLocaleDateString("ar-SA");
    }

    if (key === "phone") {
      return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{value}</span>;
    }

    return value;
  };

  const tableData = (data?.data?.hosts || []).map((host) => ({
    id: host.id || host._id,
    name: host.name || host.username || "-",
    email: host.email || "-",
    phone: host.phoneNumber || host.phone || "-",
    status: host.status || "active",
    subscription: host.subscription?.planType || "-",
    createdAt: host.createdAt || host.created_at,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("hosts.title", "إدارة العملاء")}
          headers={[
            t("hosts.columns.name", "الاسم"),
            t("hosts.columns.email", "البريد الإلكتروني"),
            t("hosts.columns.phone", "الهاتف"),
            t("hosts.columns.status", "الحالة"),
            t("hosts.columns.subscription", "الاشتراك"),
            t("hosts.columns.createdAt", "تاريخ التسجيل"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("hosts.filter.all", "الكل"), value: "" },
            { label: t("hosts.filter.active", "نشط"), value: "active" },
            { label: t("hosts.filter.suspended", "موقوف"), value: "suspended" },
          ]}
          pagination={{
            currentPage: parseInt(filters.page),
            totalPages: data?.data?.pagination?.pages || 1,
            totalItems: data?.data?.pagination?.total || 0,
            onPageChange: (page) => {
              const params = new URLSearchParams(searchParams);
              params.set("page", page);
              router.push(`?${params.toString()}`);
            },
          }}
        />
      </div>

      {showAddPopup && (
        <AddHostPopup onClose={() => setShowAddPopup(false)} />
      )}

      {showSubscriptionPopup && selectedHost && (
        <SubscriptionAssignmentPopup
          entity={selectedHost}
          entityType="host"
          onClose={() => {
            setShowSubscriptionPopup(false);
            setSelectedHost(null);
          }}
        />
      )}
    </>
  );
}
