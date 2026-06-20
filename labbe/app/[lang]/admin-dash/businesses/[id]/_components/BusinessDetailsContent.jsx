"use client";

import { useState, useCallback } from "react";
import { useAdminBusiness, useAdminBusinessMutation } from "@/hooks/admin";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import {
  FiMail,
  FiPhone,
  FiClock,
  FiCalendar,
  FiEdit2,
  FiImage,
  FiAlertCircle,
  FiCopy,
  FiRefreshCw,
  FiSlash,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import EditBusinessPopup from "./EditBusinessPopup";
import ReplaceLogoPopup from "./ReplaceLogoPopup";
import AssignPlanPopup from "./AssignPlanPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./BusinessDetailsContent.module.css";

const initials = (name) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

const fmtDate = (d, locale) =>
  d ? new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusMeta = (status, t) =>
  ({
    active: { label: t("status.active"), color: "#2a8c5b", bg: "#eaf4ef" },
    suspended: { label: t("status.suspended"), color: "#c0392b", bg: "#f9ebea" },
    inactive: { label: t("status.inactive"), color: "#767676", bg: "#f2f2f2" },
  }[status] || { label: status || "—", color: "#767676", bg: "#f2f2f2" });

const subStatusMeta = (status, t) =>
  ({
    active: { label: t("subscription.active"), color: "#2a8c5b", bg: "#eaf4ef" },
    trial: { label: t("subscription.trial"), color: "#9B59B6", bg: "#f5eef8" },
    expired: { label: t("subscription.expired"), color: "#c0392b", bg: "#f9ebea" },
    cancelled: { label: t("subscription.cancelled"), color: "#767676", bg: "#f2f2f2" },
    inactive: { label: t("subscription.inactive"), color: "#767676", bg: "#f2f2f2" },
  }[status] || { label: status || "—", color: "#767676", bg: "#f2f2f2" });

const ASSIGNMENT_STATUS_META = {
  pending_payment: { color: "#d38200", bg: "#fbf3e6" },
  payment_processing: { color: "#d38200", bg: "#fbf3e6" },
  paid: { color: "#3498db", bg: "#e8f4fd" },
  active: { color: "#2a8c5b", bg: "#eaf4ef" },
  activation_failed: { color: "#c0392b", bg: "#f9ebea" },
  failed: { color: "#c0392b", bg: "#f9ebea" },
  expired: { color: "#767676", bg: "#f2f2f2" },
  cancelled: { color: "#767676", bg: "#f2f2f2" },
  superseded: { color: "#767676", bg: "#f2f2f2" },
  refunded: { color: "#9B59B6", bg: "#f5eef8" },
};

// Checkout assignments awaiting payment can still be acted on
// (copy link / regenerate / revoke).
const ACTIONABLE_STATUSES = ["pending_payment", "payment_processing"];

export default function BusinessDetailsContent({ businessId }) {
  const router = useRouter();
  const { t, i18n } = useTranslation("adminBusinesses");
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";

  const { data, isLoading, error } = useAdminBusiness(businessId);
  const suspend = useAdminBusinessMutation("suspend");
  const activate = useAdminBusinessMutation("activate");
  const deleteBusiness = useAdminBusinessMutation("delete");
  const revokeAssignment = useAdminBusinessMutation("revokeAssignment");
  const regenerateAssignment = useAdminBusinessMutation("regenerateAssignment");

  const [editOpen, setEditOpen] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const business = data?.data?.business || data?.data || data;
  const isSuspended = business?.status === "suspended";

  const handleToggleStatus = useCallback(async () => {
    const id = business?.id || business?._id;
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
      router.refresh();
    } catch (err) {
      handleError(err, t);
    }
  }, [isSuspended, business, activate, suspend, t, router]);

  const handleDelete = useCallback(async () => {
    const id = business?.id || business?._id;
    if (!window.confirm(t("actions.confirmDelete"))) return;
    try {
      await deleteBusiness.mutateAsync(id);
      toastUtils.success(t("actions.deleteSuccess"));
      router.push(`/${i18n.language}/admin-dash/businesses`);
    } catch (err) {
      handleError(err, t);
    }
  }, [business, deleteBusiness, t, router, i18n.language]);

  const handleCopyLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toastUtils.success(t("assignments.linkCopied"));
    } catch (err) {
      handleError(err, t);
    }
  };

  const handleRegenerate = async (assignmentId) => {
    try {
      const res = await regenerateAssignment.mutateAsync({ businessId, assignmentId });
      toastUtils.success(t("assignments.regenerateSuccess"));
      const link = res?.data?.link;
      if (link) await handleCopyLink(link);
    } catch (err) {
      handleError(err, t);
    }
  };

  const handleRevoke = async (assignmentId) => {
    if (!window.confirm(t("assignments.confirmRevoke"))) return;
    try {
      await revokeAssignment.mutateAsync({ businessId, assignmentId });
      toastUtils.success(t("assignments.revokeSuccess"));
    } catch (err) {
      handleError(err, t);
    }
  };

  if (isLoading) return <SimpleLoading />;
  if (error)
    return (
      <div className={styles.errorState}>
        <FiAlertCircle size={40} />
        <p>{error.message}</p>
        <button onClick={() => router.back()}>{t("details.backToBusinesses")}</button>
      </div>
    );

  const sub = business?.subscription;
  const subStatus = subStatusMeta(sub?.status, t);
  const bStatus = statusMeta(business?.status, t);
  const setupFee = business?.setupFee;
  const assignments = business?.assignments || [];
  const totalEvents = business?.statistics?.totalEvents ?? 0;
  const description = business?.businessData?.description;

  return (
    <>
      <div className={styles.page}>
        {/* Hero / Profile */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            {business?.avatarUrl ? (
              <img className={styles.avatarImg} src={business.avatarUrl} alt={business?.name || ""} />
            ) : (
              <div className={styles.avatar}>{initials(business?.name)}</div>
            )}
            <div className={styles.heroInfo}>
              <h1 className={styles.businessName}>{business?.name || "—"}</h1>
              <span className={styles.statusPill} style={{ color: bStatus.color, background: bStatus.bg }}>
                {bStatus.label}
              </span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.btnSecondary} onClick={() => setEditOpen(true)}>
              <FiEdit2 size={15} /> {t("details.editProfile")}
            </button>
            <button className={styles.btnSecondary} onClick={() => setLogoOpen(true)}>
              <FiImage size={15} /> {t("details.replaceLogo")}
            </button>
            <button className={styles.btnPrimary} onClick={() => setAssignOpen(true)}>
              <FaCrown size={15} /> {t("actions.managePlan")}
            </button>
            <button
              className={isSuspended ? styles.btnSuccess : styles.btnDanger}
              onClick={handleToggleStatus}
              disabled={suspend.isPending || activate.isPending}
            >
              {isSuspended ? t("actions.activate") : t("actions.suspend")}
            </button>
            <button className={styles.btnDanger} onClick={handleDelete} disabled={deleteBusiness.isPending}>
              {t("actions.delete")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><FiCalendar size={18} /></div>
            <div>
              <div className={styles.statLabel}>{t("details.totalEvents")}</div>
              <div className={styles.statValue}>{totalEvents}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><FaCrown size={18} /></div>
            <div>
              <div className={styles.statLabel}>{t("subscription.status")}</div>
              <span className={styles.statBadge} style={{ color: subStatus.color, background: subStatus.bg }}>
                {subStatus.label}
              </span>
            </div>
          </div>
          {setupFee && (
            <div className={styles.statCard}>
              <div className={styles.statIcon}><FiClock size={18} /></div>
              <div>
                <div className={styles.statLabel}>{t("details.setupFeeStatus")}</div>
                <span
                  className={styles.statBadge}
                  style={
                    setupFee.settled
                      ? { color: "#2a8c5b", background: "#eaf4ef" }
                      : { color: "#d38200", background: "#fbf3e6" }
                  }
                >
                  {setupFee.settled ? t("details.setupFeeSettled") : t("details.setupFeeUnsettled")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Two columns: Contact / Subscription */}
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("details.contactInfo")}</h3>
            <div className={styles.infoList}>
              {[
                {
                  icon: <FiPhone size={15} />,
                  label: t("details.phoneNumber"),
                  value: business?.phoneNumber ? (
                    <span dir="ltr" style={{ unicodeBidi: "embed", display: "inline-block" }}>
                      {business.phoneNumber}
                    </span>
                  ) : null,
                },
                { icon: <FiMail size={15} />, label: t("details.email"), value: business?.email },
                { icon: <FiClock size={15} />, label: t("details.joinDate"), value: fmtDate(business?.createdAt, locale) },
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
            <div className={styles.descBlock}>
              <div className={styles.infoLabel}>{t("details.description")}</div>
              <p className={styles.descText}>{description || t("details.noDescription")}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>{t("subscription.title")}</h3>
            {sub ? (
              <div className={styles.subGrid}>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>{t("subscription.plan")}</span>
                  <span className={styles.subValue}>{sub?.planType || sub?.planId?.code || "—"}</span>
                </div>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>{t("subscription.status")}</span>
                  <span className={styles.statBadge} style={{ color: subStatus.color, background: subStatus.bg }}>
                    {subStatus.label}
                  </span>
                </div>
                {sub?.currentPeriodEnd && (
                  <div className={styles.subItem}>
                    <span className={styles.subLabel}>{t("subscription.expiresAt")}</span>
                    <span className={styles.subValue}>{fmtDate(sub.currentPeriodEnd, locale)}</span>
                  </div>
                )}
                {setupFee && (
                  <div className={styles.subItem}>
                    <span className={styles.subLabel}>{t("details.setupFee")}</span>
                    <span className={styles.subValue}>
                      {setupFee.amount != null ? setupFee.amount : "—"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.emptyText}>{t("subscription.none")}</p>
            )}
          </div>
        </div>

        {/* Assignments */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
              {t("assignments.title")}
            </h3>
            <button className={styles.btnPrimarySmall} onClick={() => setAssignOpen(true)}>
              <FaCrown size={13} /> {t("assignments.assignPlan")}
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className={styles.emptyText}>{t("assignments.empty")}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.assignTable}>
                <thead>
                  <tr>
                    <th>{t("assignments.columns.plan")}</th>
                    <th>{t("assignments.columns.mode")}</th>
                    <th>{t("assignments.columns.status")}</th>
                    <th>{t("assignments.columns.total")}</th>
                    <th>{t("assignments.columns.expiresAt")}</th>
                    <th>{t("assignments.columns.createdAt")}</th>
                    <th>{t("assignments.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => {
                    const sm = ASSIGNMENT_STATUS_META[a.status] || { color: "#767676", bg: "#f2f2f2" };
                    const isCheckout = a.mode === "checkout";
                    const actionable = isCheckout && ACTIONABLE_STATUSES.includes(a.status);
                    return (
                      <tr key={a.id}>
                        <td>{a.planCode || "—"}</td>
                        <td>
                          <span className={styles.modeBadge}>
                            {isCheckout ? t("assignments.mode.checkout") : t("assignments.mode.grant")}
                          </span>
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{ color: sm.color, background: sm.bg }}>
                            {t(`assignments.status.${a.status}`, a.status)}
                          </span>
                        </td>
                        <td>
                          {a.total != null
                            ? `${a.total}${a.currency ? ` ${a.currency}` : ""}`
                            : "—"}
                        </td>
                        <td>{fmtDate(a.expiresAt, locale)}</td>
                        <td>{fmtDate(a.createdAt, locale)}</td>
                        <td>
                          {actionable ? (
                            <div className={styles.rowActions}>
                              {a.link && (
                                <button
                                  className={styles.iconBtn}
                                  title={t("assignments.copyLink")}
                                  onClick={() => handleCopyLink(a.link)}
                                >
                                  <FiCopy size={14} />
                                </button>
                              )}
                              <button
                                className={styles.iconBtn}
                                title={t("assignments.regenerate")}
                                onClick={() => handleRegenerate(a.id)}
                                disabled={regenerateAssignment.isPending}
                              >
                                <FiRefreshCw size={14} />
                              </button>
                              <button
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title={t("assignments.revoke")}
                                onClick={() => handleRevoke(a.id)}
                                disabled={revokeAssignment.isPending}
                              >
                                <FiSlash size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className={styles.dash}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <EditBusinessPopup business={business} onClose={() => setEditOpen(false)} />
      )}
      {logoOpen && (
        <ReplaceLogoPopup businessId={businessId} onClose={() => setLogoOpen(false)} />
      )}
      {assignOpen && (
        <AssignPlanPopup businessId={businessId} onClose={() => setAssignOpen(false)} />
      )}
    </>
  );
}
