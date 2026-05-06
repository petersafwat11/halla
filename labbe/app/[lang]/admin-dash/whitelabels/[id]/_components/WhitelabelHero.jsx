"use client";

import Image from "next/image";
import { FaCrown, FaBuilding } from "react-icons/fa";
import styles from "./WhitelabelDetailsContent.module.css";

const wlStatusMeta = (status, t) => ({
  active:    { label: t("status.active", "Active"),         color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  suspended: { label: t("status.suspended", "Suspended"),   color: "var(--c-error-500,#c0392b)",   bg: "var(--c-error-50,#f9ebea)" },
  pending:   { label: t("status.pending", "Pending"),       color: "var(--c-warning-500,#d38200)", bg: "var(--c-warning-50,#fbf3e6)" },
  inactive:  { label: t("status.inactive", "Inactive"),     color: "var(--c-n400,#767676)",        bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "\u2014", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

export default function WhitelabelHero({ wl, onManageSubscription, onToggleStatus, isPending, isSuspended, updateStatusPending, t }) {
  const wlSt = wlStatusMeta(wl?.status, t);
  const displayName = wl?.profile?.whitelabelData?.arabicName || wl?.username || "\u2014";
  const englishName = wl?.profile?.whitelabelData?.englishName;

  return (
    <div className={styles.hero}>
      <div className={styles.heroLeft}>
        <div className={styles.avatar}>
          {wl?.profile?.whitelabelData?.logo
            ? <Image src={wl.profile.whitelabelData.logo} alt={displayName} width={64} height={64} className={styles.avatarImg} />
            : <FaBuilding size={28} />}
        </div>
        <div className={styles.heroInfo}>
          <h1 className={styles.wlName}>{displayName}</h1>
          {englishName && <span className={styles.wlNameEn}>{englishName}</span>}
          <span className={styles.username}>@{wl?.username || "\u2014"}</span>
          <span className={styles.statusPill} style={{ color: wlSt.color, background: wlSt.bg }}>
            {wlSt.label}
          </span>
        </div>
      </div>
      <div className={styles.heroActions}>
        <button className={styles.btnPrimary} onClick={onManageSubscription}>
          <FaCrown size={15} />
          {t("actions.manageSubscription", "Manage Subscription")}
        </button>
        <button
          className={isSuspended ? styles.btnSuccess : styles.btnDanger}
          onClick={onToggleStatus}
          disabled={updateStatusPending}
        >
          {isPending
            ? t("actions.approve", "\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u062d\u0633\u0627\u0628")
            : isSuspended
              ? t("actions.activateAccount", "Activate Account")
              : t("actions.suspendAccount", "Suspend Account")}
        </button>
      </div>
    </div>
  );
}
