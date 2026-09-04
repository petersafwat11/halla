"use client";

import { useState, useCallback } from "react";
import { useAdminHost, useAdminHostMutation } from "@/hooks/admin";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import SubscriptionAssignmentPopup from "../../../_components/SubscriptionAssignmentPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { FiMail, FiPhone, FiCalendar, FiClock, FiShield, FiUsers, FiCreditCard, FiAlertCircle } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { getStatusVisual } from "@/utils/statusColors";
import { formatDate } from "@halaa/shared/utils/locale";
import styles from "./HostDetailsContent.module.css";

const initials = (name) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const planMeta = (planType) => {
  if (!planType || planType === "trial") return { label: "Trial", color: "var(--c-n400)", bg: "var(--c-n200)" };
  if (planType.startsWith("single_")) {
    return { label: `Single ${planType.replace("single_", "").replace("_plus", "+")}`, color: "#3498DB", bg: "#e8f4fd" };
  }
  return ({ lite: { label: "Lite", color: "#9B59B6", bg: "#f5eef8" }, pro: { label: "Pro", color: "var(--c-p600)", bg: "var(--c-p50)" }, elite: { label: "Elite", color: "var(--c-error-500,#c0392b)", bg: "var(--c-error-50,#f9ebea)" } })[planType]
    || { label: planType, color: "var(--c-n400)", bg: "var(--c-n200)" };
};

const subStatusMeta = (status, t) => {
  const label = ({ active: t("subscription.active", "Active"), trial: t("subscription.trial", "Trial"), expired: t("hostDetails.ended", "Expired"), cancelled: t("subscription.inactive", "Cancelled") }[status]) || status || "—";
  const { fg, bg } = getStatusVisual(status, "subscription");
  return { label, color: fg, bg };
};

const hostStatusMeta = (status, t) => {
  const label = ({ active: t("status.active", "Active"), suspended: t("status.suspended", "Suspended"), inactive: t("status.inactive", "Inactive") }[status]) || status || "—";
  const { fg, bg } = getStatusVisual(status);
  return { label, color: fg, bg };
};

const eventStatusMeta = (status, t) => {
  const label = ({ scheduled: t("eventStatus.scheduled", "Scheduled"), live: t("eventStatus.live", "Live"), completed: t("eventStatus.completed", "Completed"), pending_scheduling: t("eventStatus.pending_scheduling", "Pending Scheduling") }[status]) || status || "—";
  const { fg, bg } = getStatusVisual(status);
  return { label, color: fg, bg };
};

const fmtDate = (d, locale) =>
  d ? formatDate(d, locale, { year: "numeric", month: "short", day: "numeric" }) || "—" : "—";

export default function HostDetailsContent({ hostId }) {
  const router = useRouter();
  const { t, i18n } = useTranslation("adminHosts");
  const locale = i18n.language || "ar";
  const { data, isLoading, error } = useAdminHost(hostId);
  const updateStatus = useAdminHostMutation("updateStatus");
  const [subOpen, setSubOpen] = useState(false);

  if (isLoading) return <SimpleLoading />;
  if (error) return (
    <div className={styles.errorState}>
      <FiAlertCircle size={40} />
      <p>{error.message}</p>
      <button onClick={() => router.back()}>{t("hostDetails.backToHosts", "Go Back")}</button>
    </div>
  );

  const host = data?.data?.host || data?.data || data;
  const sub = host?.subscription;
  const events = host?.events || [];
  const plan = planMeta(sub?.planType);
  const hStatus = hostStatusMeta(host?.status, t);
  const subStatus = subStatusMeta(sub?.status, t);
  const isSuspended = host?.status === "suspended";

  const handleToggleStatus = useCallback(async () => {
    const next = isSuspended ? "active" : "suspended";
    const msg = isSuspended ? t("actions.confirmActivate", "Activate this host?") : t("actions.confirmSuspend", "Suspend this host?");
    if (!window.confirm(msg)) return;
    try {
      await updateStatus.mutateAsync({ hostId: host?.id || host?._id, status: next });
      toastUtils.success(isSuspended ? t("actions.activateSuccess", "Host activated") : t("actions.suspendSuccess", "Host suspended"));
      router.refresh();
    } catch (err) { handleError(err, t); }
  }, [isSuspended, host, updateStatus, t, router]);

  const statItems = [
    { icon: <FiCalendar size={18} />, label: t("hostDetails.eventsCount", "Events"), value: events.length },
    { icon: <FiCreditCard size={18} />, label: t("subscription.plan", "Plan"), value: plan.label, badgeStyle: { color: plan.color, background: plan.bg } },
    { icon: <FiUsers size={18} />, label: t("subscription.guestsLimit", "Guests Limit"), value: sub?.limits?.maxInvitesPerEvent ?? sub?.limits?.invitePool ?? "—" },
    { icon: <FiShield size={18} />, label: t("subscription.status", "Sub Status"), value: subStatus.label, badgeStyle: { color: subStatus.color, background: subStatus.bg } },
  ];

  return (
    <>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.avatar}>{initials(host?.name)}</div>
            <div className={styles.heroInfo}>
              <h1 className={styles.hostName}>{host?.name || "—"}</h1>
              <span className={styles.hostSubtitle}>{host?.phoneNumber || host?.email || "—"}</span>
              <span className={styles.statusPill} style={{ color: hStatus.color, background: hStatus.bg }}>{hStatus.label}</span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.btnPrimary} onClick={() => setSubOpen(true)}>
              <FaCrown size={15} /> {t("actions.managePlan", "Manage Subscription")}
            </button>
            <button className={isSuspended ? styles.btnSuccess : styles.btnDanger} onClick={handleToggleStatus} disabled={updateStatus.isPending}>
              {isSuspended ? t("actions.activate", "Activate") : t("actions.suspend", "Suspend")}
            </button>
          </div>
        </div>

        <div className={styles.statsRow}>
          {statItems.map((s, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div>
                <div className={styles.statLabel}>{s.label}</div>
                {s.badgeStyle
                  ? <span className={styles.statBadge} style={s.badgeStyle}>{s.value}</span>
                  : <div className={styles.statValue}>{s.value}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.twoCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("hostDetails.contactInfo", "Contact Info")}</h3>
            <div className={styles.infoList}>
              {[
                { icon: <FiPhone size={15} />, label: t("hostDetails.phoneNumber", "Phone"), value: host?.phoneNumber ? <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>{host.phoneNumber}</span> : null },
                { icon: <FiMail size={15} />, label: t("hostDetails.email", "Email"), value: host?.email },
                { icon: <FiClock size={15} />, label: t("hostDetails.joinDate", "Join Date"), value: fmtDate(host?.createdAt, locale) },
              ].map((row, i) => (
                <div key={i} className={styles.infoRow}>
                  <div className={styles.infoIcon}>{row.icon}</div>
                  <div>
                    <div className={styles.infoLabel}>{row.label}</div>
                    <div className={styles.infoValue}>{row.value || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("subscription.title", "Subscription Info")}</h3>
            <div className={styles.subGrid}>
              {[
                { label: t("subscription.plan", "Plan"), badge: { color: plan.color, background: plan.bg }, value: plan.label },
                { label: t("subscription.status", "Status"), badge: { color: subStatus.color, background: subStatus.bg }, value: subStatus.label },
                { label: t("subscription.eventsLimit", "Events Limit"), value: sub?.limits?.maxEvents || "—" },
                { label: t("subscription.guestsLimit", "Guests Limit"), value: sub?.limits?.maxInvitesPerEvent ?? sub?.limits?.invitePool ?? "—" },
                ...(sub?.currentPeriodEnd ? [{ label: t("subscription.expiresAt", "Expires At"), value: fmtDate(sub.currentPeriodEnd, locale) }] : []),
              ].map((item, i) => (
                <div key={i} className={styles.subItem}>
                  <span className={styles.subLabel}>{item.label}</span>
                  {item.badge
                    ? <span className={styles.statBadge} style={item.badge}>{item.value}</span>
                    : <span className={styles.subValue}>{item.value}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {events.length > 0 && (
          <div className={styles.eventsSection}>
            <h3 className={styles.sectionHeading}>{t("hostDetails.eventsCount", "Events")}<span className={styles.count}>{events.length}</span></h3>
            <div className={styles.eventsGrid}>
              {events.map((ev) => {
                const es = eventStatusMeta(ev?.status, t);
                return (
                  <div key={ev.id || ev._id} className={styles.eventCard}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventTitle}>{ev.title || t("eventStatus.untitled", "Untitled")}</span>
                      <span className={styles.eventBadge} style={{ color: es.color, background: es.bg }}>{es.label}</span>
                    </div>
                    {ev.date && <div className={styles.eventDate}><FiCalendar size={13} />{fmtDate(ev.date, locale)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {subOpen && (
        <SubscriptionAssignmentPopup
          entity={host}
          entityType="host"
          onClose={() => setSubOpen(false)}
        />
      )}
    </>
  );
}
