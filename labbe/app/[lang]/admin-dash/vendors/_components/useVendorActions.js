"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FiEye, FiThumbsUp, FiStar, FiCheckCircle, FiSlash, FiTrash2, FiPauseCircle } from "react-icons/fi";
import styles from "./VendorsTable.module.css";

export default function useVendorActions({ canUpdate, canDelete, t, router, handleStatusChange, handleRatingClick, handleDelete }) {
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const getRowActions = useCallback((row) => {
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

  const bulkActions = [];
  if (canUpdate) {
    bulkActions.push({
      icon: <FiThumbsUp size={16} />,
      text: t("messages.bulkApprove"),
      onClick: (ids) => {},
    });
    bulkActions.push({
      icon: <FiPauseCircle size={16} />,
      text: t("messages.bulkSuspend"),
      onClick: (ids) => {},
    });
  }
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("messages.bulkDelete"),
      onClick: (ids) => {},
    });
  }

  return { getRowActions, bulkActions };
}
