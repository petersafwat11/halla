"use client";

import { useCallback, useMemo } from "react";
import { useAdminWhitelabelMutation } from "@/hooks/admin";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { whitelabelAPI } from "@/services/adminDashboard";

export function useWhitelabelTableActions(data) {
  const { t } = useTranslation("adminWhitelabels");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canUpdate, canDelete } = usePageAccess("whitelabels");

  const deleteWhitelabel = useAdminWhitelabelMutation("delete");
  const bulkDelete = useAdminWhitelabelMutation("bulkDelete");
  const updateStatus = useAdminWhitelabelMutation("updateStatus");

  const filters = useMemo(
    () => ({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    }),
    [searchParams]
  );

  const handleDelete = useCallback(async (whitelabelId) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    try {
      await deleteWhitelabel.mutateAsync(whitelabelId);
      toastUtils.success(t("messages.deleteSuccess"));
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messages.deleteError" });
    }
  }, [deleteWhitelabel, t]);

  const handleBulkDelete = useCallback(async (ids) => {
    if (!ids?.length) {
      toastUtils.warning(t("messages.selectRows"));
      return;
    }
    if (!confirm(t("messages.confirmBulkDelete"))) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toastUtils.success(t("messages.bulkDeleteSuccess"));
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messages.bulkDeleteError" });
    }
  }, [bulkDelete, t]);

  const handleStatusChange = useCallback(async (whitelabelId, newStatus) => {
    const successKey = newStatus === "active" ? "actions.activateSuccess" : "actions.suspendSuccess";
    const errorKey = newStatus === "active" ? "actions.activateError" : "actions.suspendError";
    try {
      await updateStatus.mutateAsync({ whitelabelId, status: newStatus });
      toastUtils.success(t(successKey));
    } catch (error) {
      handleError(error, t, { fallbackMessage: errorKey });
    }
  }, [updateStatus, t]);

  const handleExport = useCallback(async () => {
    try {
      await whitelabelAPI.export({
        search: filters.search,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messages.exportError" });
    }
  }, [filters.search, filters.status, filters.from, filters.to, t]);

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return {
    filters,
    canUpdate,
    canDelete,
    handleDelete,
    handleBulkDelete,
    handleStatusChange,
    handleExport,
    handlePageChange,
    data,
    t,
    router,
  };
}
