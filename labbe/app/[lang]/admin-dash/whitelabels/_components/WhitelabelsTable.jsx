"use client";

import { useAdminWhitelabels, useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "react-toastify";
import { FiEye, FiCheckCircle, FiSlash, FiCreditCard, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { whitelabelAPI } from "@/services/adminDashboard";
import WhitelabelSubscriptionPopup from "./WhitelabelSubscriptionPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./WhitelabelsTable.module.css";

export default function WhitelabelsTable() {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("whitelabels");
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [selectedWhitelabel, setSelectedWhitelabel] = useState(null);

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminWhitelabels(filters);
  const deleteWhitelabel = useAdminWhitelabelMutation("delete");
  const bulkDelete = useAdminWhitelabelMutation("bulkDelete");
  const updateStatus = useAdminWhitelabelMutation("updateStatus");

  const handleDelete = async (whitelabelId) => {
    if (!confirm(t("whitelabels.confirmDelete", "هل أنت متأكد من حذف هذه العلامة البيضاء؟"))) return;
    try {
      await deleteWhitelabel.mutateAsync(whitelabelId);
      toast.success(t("whitelabels.deleteSuccess", "تم حذف العلامة البيضاء بنجاح"));
    } catch (error) {
      toast.error(error.message || t("whitelabels.deleteError", "فشل حذف العلامة البيضاء"));
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) { toast.warning(t("whitelabels.selectRows", "الرجاء تحديد علامات للحذف")); return; }
    if (!confirm(t("whitelabels.confirmBulkDelete", `هل أنت متأكد من حذف ${ids.length} علامة؟`))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(t("whitelabels.bulkDeleteSuccess", "تم حذف العلامات بنجاح"));
    } catch (error) {
      toast.error(error.message || t("whitelabels.bulkDeleteError", "فشل حذف العلامات"));
    }
  };

  const handleStatusChange = async (whitelabelId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ whitelabelId, status: newStatus });
      toast.success(t("whitelabels.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toast.error(error.message || t("whitelabels.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleSubscriptionClick = (whitelabel) => {
    setSelectedWhitelabel(whitelabel);
    setShowSubscriptionPopup(true);
  };

  const handleExport = async () => {
    try {
      await whitelabelAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      toast.error(t("whitelabels.exportError", "فشل تصدير البيانات"));
    }
  };

  const getRowActions = (row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("whitelabels.viewDetails", "عرض التفاصيل"),
        onClick: (r) => router.push(`/admin-dash/whitelabels/${r.id}`),
      },
    ];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended"
          ? t("whitelabels.activate", "تفعيل")
          : t("whitelabels.suspend", "إيقاف"),
        onClick: (r) => handleStatusChange(r.id, r.status === "suspended" ? "active" : "suspended"),
      });
      actions.push({
        type: "dropdown",
        icon: <FiCreditCard size={16} />,
        text: t("whitelabels.subscription", "الاشتراك"),
        onClick: (r) => {
          const wl = (data?.data?.whitelabels || data?.data || []).find(w => (w.id || w._id) === r.id);
          if (wl) handleSubscriptionClick({ ...r, ...wl });
        },
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("whitelabels.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("whitelabels.bulkDelete", "حذف المحدد"),
      onClick: (ids) => handleBulkDelete(ids),
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        active: { bg: "#EAF4EF", color: "#2A8C5B", text: t("whitelabels.status.active", "نشط") },
        pending: { bg: "#FBF3E6", color: "#D38200", text: t("whitelabels.status.pending", "قيد الانتظار") },
        suspended: { bg: "#F9EBEA", color: "#C0392B", text: t("whitelabels.status.suspended", "موقوف") },
      };
      const config = statusConfig[value] || statusConfig.active;
      return (
        <div
          style={{
            display: "inline-flex", padding: "0.3rem 1.2rem", justifyContent: "center",
            alignItems: "center", borderRadius: "9999px", background: config.bg,
            cursor: canUpdate ? "pointer" : "default",
          }}
          onClick={() => {
            if (!canUpdate) return;
            handleStatusChange(row.id, value === "active" ? "suspended" : "active");
          }}
        >
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>{config.text}</span>
        </div>
      );
    }

    if (key === "subscription") {
      return (
        <span
          style={{ color: canUpdate ? "#3498DB" : "inherit", cursor: canUpdate ? "pointer" : "default", textDecoration: canUpdate ? "underline" : "none" }}
          onClick={() => canUpdate && handleSubscriptionClick(row)}
        >
          {value || t("whitelabels.noSubscription", "لا يوجد")}
        </span>
      );
    }

    if (key === "createdAt" && value) return new Date(value).toLocaleDateString("ar-SA");
    return value;
  };

  const tableData = (data?.data?.whitelabels || data?.data || []).map((wl) => ({
    id: wl.id || wl._id,
    name: wl.username || wl.name || "-",
    email: wl.email || "-",
    phone: wl.phoneNumber || wl.phone || "-",
    domain: wl.domain || "-",
    status: wl.status || "active",
    subscription: wl.subscription?.plan?.name || wl.subscription?.planCode || "-",
    createdAt: wl.createdAt || wl.created_at,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("whitelabels.title", "إدارة العلامات البيضاء")}
          headers={[
            t("whitelabels.columns.name", "الاسم"),
            t("whitelabels.columns.email", "البريد الإلكتروني"),
            t("whitelabels.columns.phone", "الهاتف"),
            t("whitelabels.columns.domain", "النطاق"),
            t("whitelabels.columns.status", "الحالة"),
            t("whitelabels.columns.subscription", "الاشتراك"),
            t("whitelabels.columns.createdAt", "تاريخ التسجيل"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("whitelabels.filter.all", "الكل"), value: "" },
            { label: t("whitelabels.filter.active", "نشط"), value: "active" },
            { label: t("whitelabels.filter.pending", "قيد الانتظار"), value: "pending" },
            { label: t("whitelabels.filter.suspended", "موقوف"), value: "suspended" },
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

      {showSubscriptionPopup && selectedWhitelabel && (
        <WhitelabelSubscriptionPopup
          whitelabel={selectedWhitelabel}
          onClose={() => { setShowSubscriptionPopup(false); setSelectedWhitelabel(null); }}
        />
      )}
    </>
  );
}
