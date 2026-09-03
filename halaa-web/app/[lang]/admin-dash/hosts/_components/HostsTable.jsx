"use client";

import {
  useAdminHosts,
  useAdminHostMutation,
  useAdminHostsExport,
} from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEye, FiCheckCircle, FiSlash, FiCreditCard, FiTrash2 } from "react-icons/fi";
import { normalizeAdminFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { getStatusVisual } from "@/utils/statusColors";
import AddHostPopup from "./AddHostPopup";
import SubscriptionAssignmentPopup from "../../_components/SubscriptionAssignmentPopup";
import styles from "./HostsTable.module.css";

export default function HostsTable({ showAddPopup: externalShowAdd, setShowAddPopup: externalSetShowAdd }) {
  const { t } = useTranslation("adminHosts");
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const searchParams = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePageAccess("hosts");
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const showAddPopup = externalShowAdd !== undefined ? externalShowAdd : internalShowAdd;
  const setShowAddPopup = externalSetShowAdd || setInternalShowAdd;
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);

  const filters = useMemo(() => normalizeAdminFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading } = useAdminHosts(filters);
  const deleteHost = useAdminHostMutation("delete");
  const bulkDelete = useAdminHostMutation("bulkDelete");
  const updateStatus = useAdminHostMutation("updateStatus");
  const exportHosts = useAdminHostsExport();

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

  const findFullHost = (id) =>
    (data?.data?.hosts || []).find((host) => (host.id || host._id) === id) || null;

  const handleSubscriptionClick = (host) => {
    const id = host?.id || host?._id;
    const fullHost = id ? findFullHost(id) : null;
    setSelectedHost(fullHost ? { ...host, ...fullHost } : host);
    setShowSubscriptionPopup(true);
  };

  const handleExport = async () => {
    try {
      await exportHosts.mutateAsync({ search: filters.search, status: filters.status, from: filters.from, to: filters.to });
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
        onClick: (r) => router.push(`/${lang}/admin-dash/hosts/${r.id}`),
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
      const labels = {
        active: t("status.active", "Active"),
        pending: t("hostDetails.pending", "Pending"),
        suspended: t("status.suspended", "Suspended"),
      };
      const { fg, bg } = getStatusVisual(value);
      return (
        <div
          className={`${styles.statusBadge} ${styles.statusBadgeReadonly}`}
          style={{ background: bg }}
        >
          <span className={styles.statusBadgeText} style={{ color: fg }}>
            {labels[value] || labels.active}
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

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (statusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue) {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const tableData = (data?.data?.hosts || []).map((host) => ({
    id: host.id || host._id,
    name: host.name || "-",
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
          mode="server"
          title={t("hosts.title", "إدارة العملاء")}
          headers={[
            t("hosts.columns.name", "الاسم"),
            t("hosts.columns.email", "البريد الإلكتروني"),
            t("hosts.columns.phone", "الجوال"),
            t("hosts.columns.status", "الحالة"),
            t("hosts.columns.subscription", "الاشتراك"),
            t("hosts.columns.createdAt", "تاريخ التسجيل"),
          ]}
          data={tableData}
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          activeFilter={filters.status}
          onFilterChange={handleFilterChange}
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
            currentPage: parseInt(filters.page, 10) || 1,
            totalPages: data?.data?.pagination?.pages || 1,
            totalItems: data?.data?.pagination?.total || 0,
            onPageChange: handlePageChange,
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
