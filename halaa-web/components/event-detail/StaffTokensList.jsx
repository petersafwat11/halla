"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import {
  useEventStaffTokens,
  useRevokeStaffAccess,
} from "@/hooks/staff";
import { formatDateTime } from "@halaa/shared/utils/locale";
import styles from "./staffTokensList.module.css";

const formatDate = (value, locale = "ar") => {
  if (!value) return null;
  return formatDateTime(value, locale) || null;
};

const tokenStatus = (token) => {
  if (token.isRevoked) return "revoked";
  if (token.isExpired) return "expired";
  return "active";
};

export default function StaffTokensList({ eventId, staffList }) {
  const { t, i18n } = useTranslation("home-events");
  const { canDelete } = usePageAccess("events");
  const { data, isLoading } = useEventStaffTokens(eventId);
  const revokeMutation = useRevokeStaffAccess();

  if (isLoading) {
    return <p className={styles.empty}>...</p>;
  }

  const tokens = data?.tokens || [];
  const tokensByPhone = tokens.reduce((acc, tok) => {
    const key = (tok.phone || "").trim();
    if (!acc[key]) acc[key] = tok;
    return acc;
  }, {});

  if (!staffList || staffList.length === 0) {
    return null;
  }

  const handleRevoke = (staffId) => {
    revokeMutation.mutate({ eventId, staffId });
  };

  return (
    <ul className={styles.list}>
      {staffList.map((member) => {
        const phoneKey = (member.phone || member.mobile || "").trim();
        const token = tokensByPhone[phoneKey];
        const status = token ? tokenStatus(token) : "active";
        const isRevoked = status === "revoked";
        return (
          <li key={member._id || member.id} className={styles.row}>
            <div className={styles.info}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{member.name}</span>
                <span
                  className={`${styles.badge} ${styles[`badge_${status}`]}`}
                >
                  {t(`singleEvent.staffTokens.status.${status}`)}
                </span>
              </div>
              <span className={styles.phone}>
                {member.phone || member.mobile}
              </span>
              {token?.lastUsedAt ? (
                <span className={styles.meta}>
                  {t("singleEvent.staffTokens.lastUsedAt")}:{" "}
                  {formatDate(token.lastUsedAt, i18n?.language || "ar")}
                </span>
              ) : null}
              {token?.useCount ? (
                <span className={styles.meta}>
                  {t("singleEvent.staffTokens.useCount")}: {token.useCount}
                </span>
              ) : null}
            </div>
            {canDelete && !isRevoked ? (
              <button
                type="button"
                className={styles.revokeButton}
                onClick={() => handleRevoke(member._id || member.id)}
                disabled={revokeMutation.isPending || revokeMutation.isLoading}
              >
                {t("singleEvent.staffTokens.revoke")}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
