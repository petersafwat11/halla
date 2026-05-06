"use client";

import { FiExternalLink } from "react-icons/fi";
import styles from "./WhitelabelDetailsContent.module.css";

const hostStatusMeta = (status, t) => ({
  active:    { label: t("status.active", "Active"),    color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  suspended: { label: t("status.suspended", "Suspended"), color: "var(--c-error-500,#c0392b)", bg: "var(--c-error-50,#f9ebea)" },
  inactive:  { label: t("status.inactive", "Inactive"), color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "\u2014", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

const initials = (name) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "\u2014";

export default function WhitelabelHostsList({ hosts, stats, lang, router, t }) {
  if (!hosts?.length) return null;

  return (
    <div className={styles.hostsSection}>
      <h3 className={styles.sectionHeading}>
        {t("hosts.registeredHosts", "Registered Hosts")}
        <span className={styles.count}>{stats.hostsCount ?? hosts.length}</span>
      </h3>
      <div className={styles.hostsGrid}>
        {hosts.map((host) => {
          const hs = hostStatusMeta(host?.status, t);
          return (
            <div key={host.id || host._id} className={styles.hostCard}>
              <div className={styles.hostAvatarSmall}>
                {initials(host?.name || host?.username)}
              </div>
              <div className={styles.hostInfo}>
                <div className={styles.hostName}>{host?.name || host?.username || "\u2014"}</div>
                <div className={styles.hostEmail}>{host?.email || "\u2014"}</div>
                <div className={styles.hostMeta}>
                  <span className={styles.hostBadge} style={{ color: hs.color, background: hs.bg }}>
                    {hs.label}
                  </span>
                  <span className={styles.hostDate}>{fmtDate(host?.createdAt)}</span>
                </div>
              </div>
              <button
                className={styles.hostViewBtn}
                onClick={() => router.push(`/${lang}/admin-dash/hosts/${host.id || host._id}`)}
                title={t("actions.viewDetails", "View Details")}
              >
                <FiExternalLink size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
