"use client";

import { useAdminVendors, useAdminVendorMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "react-toastify";
import { FiEye, FiThumbsUp, FiStar, FiCheckCircle, FiSlash, FiTrash2, FiPauseCircle } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import { vendorsAPI } from "@/services/adminDashboard";
import VendorRatingPopup from "./VendorRatingPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./VendorsTable.module.css";

export default function VendorsTable() {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("vendors");
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminVendors(filters);
  const deleteVendor = useAdminVendorMutation("delete");
  const bulkDelete = useAdminVendorMutation("bulkDelete");
  const updateStatus = useAdminVendorMutation("updateStatus");
  const bulkStatus = useAdminVendorMutation("bulkStatus");

  const handleDelete = async (vendorId) => {
    if (!confirm(t("vendors.confirmDelete", "هل أنت متأكد من حذف هذا التاجر؟"))) return;
    try {
      await deleteVendor.mutateAsync(vendorId);
      toast.success(t("vendors.deleteSuccess", "تم حذف التاجر بنجاح"));
    } catch (error) {
      toast.error(error.message || t("vendors.deleteError", "فشل حذف التاجر"));
    }
  };

  const handleBulkDelete = async (ids) => {
    if (!ids?.length) { toast.warning(t("vendors.selectRows", "الرجاء تحديد تجار للحذف")); return; }
    if (!confirm(t("vendors.confirmBulkDelete", `هل أنت متأكد من حذف ${ids.length} تاجر؟`))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(t("vendors.bulkDeleteSuccess", "تم حذف التجار بنجاح"));
    } catch (error) {
      toast.error(error.message || t("vendors.bulkDeleteError", "فشل حذف التجار"));
    }
  };

  const handleStatusChange = async (vendorId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ vendorId, status: newStatus });
      toast.success(t("vendors.statusUpdateSuccess", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      toast.error(error.message || t("vendors.statusUpdateError", "فشل تحديث الحالة"));
    }
  };

  const handleBulkApprove = async (ids) => {
    if (!ids?.length) { toast.warning(t("vendors.selectRows", "الرجاء تحديد تجار")); return; }
    try {
      await bulkStatus.mutateAsync({ vendorIds: ids, status: "approved" });
      toast.success(t("vendors.bulkApproveSuccess", "تم اعتماد التجار بنجاح"));
    } catch (error) {
      toast.error(error.message || t("vendors.bulkApproveError", "فشل اعتماد التجار"));
    }
  };

  const handleBulkSuspend = async (ids) => {
    if (!ids?.length) { toast.warning(t("vendors.selectRows", "الرجاء تحديد تجار")); return; }
    try {
      await bulkStatus.mutateAsync({ vendorIds: ids, status: "suspended" });
      toast.success(t("vendors.bulkSuspendSuccess", "تم إيقاف التجار بنجاح"));
    } catch (error) {
      toast.error(error.message || t("vendors.bulkSuspendError", "فشل إيقاف التجار"));
    }
  };

  const handleRatingClick = (vendor) => {
    setSelectedVendor(vendor);
    setShowRatingPopup(true);
  };

  const handleExport = async () => {
    try {
      await vendorsAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      toast.error(t("vendors.exportError", "فشل تصدير البيانات"));
    }
  };

  const getRowActions = (row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("vendors.viewDetails", "عرض التفاصيل"),
        onClick: (r) => router.push(`/admin-dash/vendors/${r.id}`),
      },
    ];

    if (canUpdate) {
      if (row.status === "pending" || row.status === "rejected") {
        actions.push({
          type: "dropdown",
          icon: <FiThumbsUp size={16} />,
          text: t("vendors.approve", "اعتماد"),
          onClick: (r) => handleStatusChange(r.id, "approved"),
        });
      }
      actions.push({
        type: "dropdown",
        icon: <FiStar size={16} />,
        text: t("vendors.rating", "التقييم"),
        onClick: (r) => handleRatingClick(r),
      });
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended"
          ? t("vendors.activate", "تفعيل")
          : t("vendors.suspend", "إيقاف"),
        onClick: (r) => handleStatusChange(r.id, r.status === "suspended" ? "approved" : "suspended"),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("vendors.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canUpdate) {
    bulkActions.push({
      icon: <FiThumbsUp size={16} />,
      text: t("vendors.bulkApprove", "اعتماد المحدد"),
      onClick: (ids) => handleBulkApprove(ids),
    });
    bulkActions.push({
      icon: <FiPauseCircle size={16} />,
      text: t("vendors.bulkSuspend", "إيقاف المحدد"),
      onClick: (ids) => handleBulkSuspend(ids),
    });
  }
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("vendors.bulkDelete", "حذف المحدد"),
      onClick: (ids) => handleBulkDelete(ids),
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "status") {
      const statusConfig = {
        approved: { bg: "#EAF4EF", color: "#2A8C5B", text: t("vendors.status.approved", "معتمد") },
        pending: { bg: "#FBF3E6", color: "#D38200", text: t("vendors.status.pending", "قيد المراجعة") },
        rejected: { bg: "#F9EBEA", color: "#C0392B", text: t("vendors.status.rejected", "مرفوض") },
        suspended: { bg: "#F9EBEA", color: "#C0392B", text: t("vendors.status.suspended", "موقوف") },
      };
      const config = statusConfig[value] || statusConfig.pending;
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
          }}
        >
          <span style={{ color: config.color, fontFamily: "Cairo", fontSize: "1.2rem" }}>
            {config.text}
          </span>
        </div>
      );
    }

    if (key === "rating") {
      return (
        <span
          style={{ color: canUpdate ? "#3498DB" : "inherit", cursor: canUpdate ? "pointer" : "default", textDecoration: canUpdate ? "underline" : "none" }}
          onClick={() => canUpdate && handleRatingClick(row)}
        >
          {value ? `${value}/5` : t("vendors.noRating", "لا يوجد")}
        </span>
      );
    }

    if (key === "createdAt" && value) {
      return new Date(value).toLocaleDateString("ar-SA");
    }

    return value;
  };

  const tableData = (data?.data?.vendors || data?.data || []).map((vendor) => ({
    id: vendor.id || vendor._id,
    name: vendor.brandName || vendor.username || vendor.name || "-",
    email: vendor.email || "-",
    phone: vendor.phoneNumber || vendor.phone || "-",
    category: vendor.serviceCategories?.[0] || vendor.category || "-",
    status: vendor.vendorStatus || vendor.status || "pending",
    rating: vendor.rating || 0,
    createdAt: vendor.createdAt || vendor.created_at,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("vendors.title", "إدارة التجار")}
          headers={[
            t("vendors.columns.name", "الاسم"),
            t("vendors.columns.email", "البريد الإلكتروني"),
            t("vendors.columns.phone", "الهاتف"),
            t("vendors.columns.category", "الفئة"),
            t("vendors.columns.status", "الحالة"),
            t("vendors.columns.rating", "التقييم"),
            t("vendors.columns.createdAt", "تاريخ التسجيل"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canUpdate || canDelete}
          bulkActions={bulkActions}
          showExport={true}
          onExportClick={handleExport}
          filterOptions={[
            { label: t("vendors.filter.all", "الكل"), value: "" },
            { label: t("vendors.filter.approved", "معتمد"), value: "approved" },
            { label: t("vendors.filter.pending", "قيد المراجعة"), value: "pending" },
            { label: t("vendors.filter.suspended", "موقوف"), value: "suspended" },
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

      {showRatingPopup && selectedVendor && (
        <VendorRatingPopup
          vendor={selectedVendor}
          onClose={() => {
            setShowRatingPopup(false);
            setSelectedVendor(null);
          }}
        />
      )}
    </>
  );
}
