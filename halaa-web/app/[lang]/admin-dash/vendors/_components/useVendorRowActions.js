"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { FiEye, FiThumbsUp, FiStar, FiCheckCircle, FiSlash, FiTrash2, FiPauseCircle } from "react-icons/fi";

export function useRowActions({ canUpdate, canDelete, t, router, handleStatusChange, handleRatingClick, handleDelete }) {
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  return useCallback((row) => {
    const actions = [
      {
        type: "dropdown",
        icon: <FiEye size={16} />,
        text: t("table.actions.viewDetails"),
        onClick: (r) => router.push(`/${lang}/admin-dash/vendors/${r.id}`),
      },
    ];

    if (canUpdate) {
      if (row.status === "pending" || row.status === "rejected") {
        actions.push({
          type: "dropdown",
          icon: <FiThumbsUp size={16} />,
          text: t("table.actions.approve"),
          onClick: (r) => handleStatusChange(r.id, "approved"),
        });
      }
      actions.push({
        type: "dropdown",
        icon: <FiStar size={16} />,
        text: t("table.actions.giveRating"),
        onClick: (r) => handleRatingClick(r),
      });
      actions.push({
        type: "dropdown",
        icon: row.status === "suspended" ? <FiCheckCircle size={16} /> : <FiSlash size={16} />,
        text: row.status === "suspended"
          ? t("messages.activate")
          : t("table.actions.suspend"),
        onClick: (r) => handleStatusChange(r.id, r.status === "suspended" ? "approved" : "suspended"),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("table.actions.delete"),
        onClick: (r) => handleDelete(r.id),
      });
    }

    return actions;
  }, [canUpdate, canDelete, t, router, lang, handleStatusChange, handleRatingClick, handleDelete]);
}

export function useBulkActions({ canUpdate, canDelete, t, handleBulkApprove, handleBulkSuspend, handleBulkDelete }) {
  return useMemo(() => {
    const actions = [];
    if (canUpdate) {
      actions.push({
        icon: <FiThumbsUp size={16} />,
        text: t("messages.bulkApprove"),
        onClick: (ids) => handleBulkApprove(ids),
      });
      actions.push({
        icon: <FiPauseCircle size={16} />,
        text: t("messages.bulkSuspend"),
        onClick: (ids) => handleBulkSuspend(ids),
      });
    }
    if (canDelete) {
      actions.push({
        icon: <FiTrash2 size={16} />,
        text: t("messages.bulkDelete"),
        onClick: (ids) => handleBulkDelete(ids),
      });
    }
    return actions;
  }, [canUpdate, canDelete, t, handleBulkApprove, handleBulkSuspend, handleBulkDelete]);
}
