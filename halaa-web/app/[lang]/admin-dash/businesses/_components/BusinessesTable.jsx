"use client";

import { useAdminBusinesses, useAdminBusinessMutation } from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { FiEye, FiCheckCircle, FiSlash, FiTrash2, FiCreditCard, FiEdit2 } from "react-icons/fi";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import Table from "@/ui/commen/new-table/Table";
import AddBusinessPopup from "./AddBusinessPopup";
import EditBusinessPopup from "../[id]/_components/EditBusinessPopup";
import AssignPlanPopup from "../[id]/_components/AssignPlanPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./BusinessesTable.module.css";

export default function BusinessesTable({ showAddPopup, setShowAddPopup }) {
  const { t } = useTranslation("adminBusinesses");
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("businesses");

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminBusinesses(filters);
  const suspend = useAdminBusinessMutation("suspend");
  const activate = useAdminBusinessMutation("activate");
  const deleteBusiness = useAdminBusinessMutation("delete");

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  // The row carries only display fields; the popups need the full business
  // object (e.g. businessData.description), so we look it up from the list.
  const findFullBusiness = (id) =>
    (data?.data?.businesses || []).find((b) => (b.id || b._id) === id) || null;

  const openAssignPlan = (id) => {
    const business = findFullBusiness(id);
    if (!business) return;
    setSelectedBusiness(business);
    setShowAssignPopup(true);
  };

  const openEditProfile = (id) => {
    const business = findFullBusiness(id);
    if (!business) return;
    setSelectedBusiness(business);
    setShowEditPopup(true);
  };

  const closePopups = () => {
    setShowAssignPopup(false);
    setShowEditPopup(false);
    setSelectedBusiness(null);
  };

  const handleToggleStatus = async (id, isSuspended) => {
    const msg = isSuspended ? t("actions.confirmActivate") : t("actions.confirmSuspend");
    if (!window.confirm(msg)) return;
    try {
      if (isSuspended) {
        await activate.mutateAsync(id);
        toastUtils.success(t("actions.activateSuccess"));
      } else {
        await suspend.mutateAsync(id);
        toastUtils.success(t("actions.suspendSuccess"));
      }
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("actions.confirmDelete"))) return;
    try {
      await deleteBusiness.mutateAsync(id);
      toastUtils.success(t("actions.deleteSuccess"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const getRowActions = (row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("table.viewDetails"),
        onClick: (r) => router.push(`/${lang}/admin-dash/businesses/${r.id}`),
      },
    ];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: <FiCreditCard size={16} />,
        text: t("table.managePlan", "تعيين باقة"),
        onClick: (r) => openAssignPlan(r.id),
      });
      actions.push({
        type: "dropdown",
        icon: <FiEdit2 size={16} />,
        text: t("table.editProfile", "تعديل البيانات"),
        onClick: (r) => openEditProfile(r.id),
      });
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended" ? t("table.activate") : t("table.suspend"),
        onClick: (r) => handleToggleStatus(r.id, r.status === "suspended"),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("table.delete"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  };

  const renderCell = (key, value) => {
    if (key === "status") {
      const labels = {
        active: t("status.active"),
        suspended: t("status.suspended"),
        inactive: t("status.inactive"),
      };
      const { fg, bg } = getStatusVisual(value);
      return (
        <div
          className={`${styles.statusBadge} ${styles.statusBadgeReadonly}`}
          style={{ background: bg }}
        >
          <span className={styles.statusBadgeText} style={{ color: fg }}>
            {labels[value] || labels.inactive}
          </span>
        </div>
      );
    }

    if (key === "createdAt" && value) {
      return new Date(value).toLocaleDateString(lang === "en" ? "en-US" : "ar-SA");
    }

    if (key === "phone") {
      return <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{value}</span>;
    }

    return value;
  };

  const tableData = (data?.data?.businesses || []).map((business) => ({
    id: business.id || business._id,
    name: business.name || "-",
    email: business.email || "-",
    phone: business.phoneNumber || "-",
    status: business.status || "inactive",
    subscription: business.subscription?.planType || business.subscription?.status || "-",
    createdAt: business.createdAt || business.created_at,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("table.title")}
          headers={[
            t("table.columns.name"),
            t("table.columns.email"),
            t("table.columns.phone"),
            t("table.columns.status"),
            t("table.columns.subscription"),
            t("table.columns.createdAt"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={false}
          filterOptions={[
            { label: t("table.filter.all"), value: "" },
            { label: t("table.filter.active"), value: "active" },
            { label: t("table.filter.suspended"), value: "suspended" },
            { label: t("table.filter.inactive"), value: "inactive" },
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

      {showAddPopup && <AddBusinessPopup onClose={() => setShowAddPopup(false)} />}

      {showAssignPopup && selectedBusiness && (
        <AssignPlanPopup
          businessId={selectedBusiness.id || selectedBusiness._id}
          business={selectedBusiness}
          onClose={closePopups}
        />
      )}

      {showEditPopup && selectedBusiness && (
        <EditBusinessPopup business={selectedBusiness} onClose={closePopups} />
      )}
    </>
  );
}
