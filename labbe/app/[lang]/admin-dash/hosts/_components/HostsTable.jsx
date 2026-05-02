"use client";

import { useAdminHosts, useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "react-toastify";
import { FiEye, FiCheckCircle, FiSlash, FiCreditCard, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { hostsAPI } from "@/services/adminDashboard";
import AddHostPopup from "./AddHostPopup";
import HostSubscriptionPopup from "./HostSubscriptionPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./HostsTable.module.css";

export default function HostsTable({ showAddPopup: externalShowAdd, setShowAddPopup: externalSetShowAdd }) {
  const { t } = useTranslation("adminDashboard");
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
    if (!confirm(t("hosts.confirmDelete", "هل أنت متأكد من حذف هذا العميل؟"))) return;
    try {
      await deleteHost.mutateAsync(hostId);
      toast.success(t("hosts.deleteSuccess", "تم حذف العميل بنجاح"));
    } catch (error) {
      toast.error(error.message || t("hosts.deleteError", "فشل حذف العميل"));
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) {
      toast.warning(t("hosts.selectRows", "الرجاء تحديد عملاء للحذف"));
      return;
    }
    if (!confirm(t("hosts.confirmBulkDelete", `هل أنت متأكد من حذف ${ids.length} عميل؟`))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(t("hosts.bulkDeleteSuccess", "تم حذف العملاء بنجاح"));
    } catch (error) {
      toast.error(error.message || t("hosts.bulkDeleteError", "فشل حذف العملاء"));
    }
  };

  const handleStatusChange = async (hostId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ hostId, status: newStatus });
      toast.success(t("hosts.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toast.error(error.message || t("hosts.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleSubscriptionClick = (host) => {
    setSelectedHost(host);
    setShowSubscriptionPopup(true);
  };

  const handleExport = async () => {
    try {
      await hostsAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      toast.error(t("hosts.exportError", "فشل تصدير البيانات"));
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
          const host = (data?.data?.hosts || data?.data || []).find(h => (h.id || h._id) === r.id);
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
        active: { bg: "#EAF4EF", color: "#2A8C5B", text: t("hosts.status.active", "نشط") },
        pending: { bg: "#FBF3E6", color: "#D38200", text: t("hosts.status.pending", "قيد الانتظار") },
        suspended: { bg: "#F9EBEA", color: "#C0392B", text: t("hosts.status.suspended", "موقوف") },
      };
      const config = statusConfig[value] || statusConfig.active;
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
            cursor: canUpdate ? "pointer" : "default",
          }}
          onClick={() => {
            if (!canUpdate) return;
            const newStatus = value === "active" ? "suspended" : "active";
            handleStatusChange(row.id, newStatus);
          }}
        >
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>
            {config.text}
          </span>
        </div>
      );
    }

    if (key === "subscription") {
      return (
        <span
          style={{ color: canUpdate ? "#3498DB" : "inherit", cursor: canUpdate ? "pointer" : "default", textDecoration: canUpdate ? "underline" : "none" }}
          onClick={() => canUpdate && handleSubscriptionClick(row)}
        >
          {value || t("hosts.noSubscription", "لا يوجد")}
        </span>
      );
    }

    if (key === "createdAt" && value) {
      return new Date(value).toLocaleDateString("ar-SA");
    }

    return value;
  };

  const tableData = (data?.data?.hosts || data?.data || []).map((host) => ({
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
            totalPages: data?.data?.pagination?.pages || data?.pagination?.totalPages || 1,
            totalItems: data?.data?.pagination?.total || data?.pagination?.total || 0,
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
        <HostSubscriptionPopup
          host={selectedHost}
          onClose={() => {
            setShowSubscriptionPopup(false);
            setSelectedHost(null);
          }}
        />
      )}
    </>
  );
}
