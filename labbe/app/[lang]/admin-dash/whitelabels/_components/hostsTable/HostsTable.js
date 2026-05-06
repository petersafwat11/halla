"use client";
import React, { useCallback } from "react";
import styles from "./hostsTable.module.css";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { FaUsers, FaExternalLinkAlt } from "react-icons/fa";

const STATUS_CSS_MAP = {
  active: styles.statusActive,
  suspended: styles.statusSuspended,
  inactive: styles.statusInactive,
};

const HostsTable = ({ hosts, whitelabelId, stats }) => {
  const { t } = useTranslation("adminWhitelabels");
  const router = useRouter();
  const params = useParams();

  const getStatusBadge = useCallback((status) => {
    const cssClass = STATUS_CSS_MAP[status] || STATUS_CSS_MAP.inactive;
    return {
      className: cssClass,
      label: t(`status.${status}`, status),
    };
  }, [t]);

  const handleViewHost = useCallback((hostId) => {
    router.push(`/${params.lang}/admin-dash/hosts/${hostId}`);
  }, [router, params.lang]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FaUsers className={styles.icon} />
          <h3 className={styles.title}>{t("hosts.title", "المضيفين")}</h3>
          <span className={styles.count}>
            ({stats?.hostsCount || hosts.length})
          </span>
        </div>
      </div>

      {hosts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{t("hosts.noHosts", "لا يوجد مضيفين مسجلين بعد")}</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("hosts.columns.name", "الاسم")}</th>
                <th>{t("hosts.columns.email", "البريد الإلكتروني")}</th>
                <th>{t("hosts.columns.phone", "رقم الهاتف")}</th>
                <th>{t("hosts.columns.status", "الحالة")}</th>
                <th>{t("hosts.columns.createdAt", "تاريخ التسجيل")}</th>
                <th>{t("hosts.columns.actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => {
                const statusBadge = getStatusBadge(host.status);
                return (
                  <tr key={host.id || host._id}>
                    <td>{host.name || host.username || "-"}</td>
                    <td>{host.email || "-"}</td>
                    <td>{host.phoneNumber || "-"}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td>
                      {host.createdAt
                        ? new Date(host.createdAt).toLocaleDateString("ar-EG")
                        : "-"}
                    </td>
                    <td>
                      <button
                        className={styles.viewButton}
                        onClick={() => handleViewHost(host.id || host._id)}
                      >
                        <FaExternalLinkAlt size={14} />
                        <span>{t("hosts.viewDetails", "عرض")}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HostsTable;
