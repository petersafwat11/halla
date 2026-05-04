"use client";

import { useState } from "react";
import { useAdminWhitelabel, useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import WhitelabelSubscriptionPopup from "../../_components/WhitelabelSubscriptionPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ApproveWhitelabelDialog from "@/ui/admin/whitelabels/ApproveWhitelabelDialog";
import {
  FiMail, FiPhone, FiCalendar, FiClock,
  FiShield, FiUsers, FiCreditCard, FiAlertCircle, FiExternalLink,
} from "react-icons/fi";
import { FaCrown, FaBuilding } from "react-icons/fa";
import styles from "./WhitelabelDetailsContent.module.css";

/* ─── helpers ─── */
const initials = (name) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const planMeta = (planType) => {
  const map = {
    pro:   { label: "Pro",   color: "#9B59B6", bg: "#f5eef8" },
    elite: { label: "Elite", color: "var(--c-p600,#b18154)", bg: "var(--c-p50,#f9f4ef)" },
  };
  return map[planType] || { label: "لا يوجد", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" };
};

const subStatusMeta = (status) => ({
  active:    { label: "نشط",   color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  trial:     { label: "تجريبي", color: "#9B59B6", bg: "#f5eef8" },
  expired:   { label: "منتهي", color: "var(--c-error-500,#c0392b)",  bg: "var(--c-error-50,#f9ebea)" },
  cancelled: { label: "ملغي",  color: "var(--c-n400,#767676)",       bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "—", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

const wlStatusMeta = (status) => ({
  active:    { label: "نشط",         color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  suspended: { label: "موقوف",       color: "var(--c-error-500,#c0392b)",   bg: "var(--c-error-50,#f9ebea)" },
  pending:   { label: "قيد المراجعة", color: "var(--c-warning-500,#d38200)", bg: "var(--c-warning-50,#fbf3e6)" },
  inactive:  { label: "غير نشط",     color: "var(--c-n400,#767676)",        bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "—", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

const hostStatusMeta = (status) => ({
  active:    { label: "نشط",    color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  suspended: { label: "موقوف", color: "var(--c-error-500,#c0392b)",   bg: "var(--c-error-50,#f9ebea)" },
  inactive:  { label: "غير نشط", color: "var(--c-n400,#767676)",      bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "—", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

const limitLabel = (v) => (v === -1 ? "غير محدود" : v ?? "—");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "—";

/* ─── component ─── */
export default function WhitelabelDetailsContent({ whitelabelId }) {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation("adminWhitelabels");
  const { data, isLoading, error } = useAdminWhitelabel(whitelabelId);
  const updateStatus = useAdminWhitelabelMutation("updateStatus");
  const [subOpen, setSubOpen] = useState(false);
  // Phase 4b W1-WL-EMAIL: explicit Approve dialog (D5).
  const [approveOpen, setApproveOpen] = useState(false);

  if (isLoading) return <SimpleLoading />;

  if (error) return (
    <div className={styles.errorState}>
      <FiAlertCircle size={40} />
      <p>{error.message}</p>
      <button onClick={() => router.back()}>العودة</button>
    </div>
  );

  const wl    = data?.data?.whitelabel || data?.data || data;
  const sub   = wl?.subscription;
  const stats = wl?.statistics || {};
  const hosts = wl?.recentHosts || [];
  const plan  = planMeta(sub?.planType);
  const wlSt  = wlStatusMeta(wl?.status);
  const subSt = subStatusMeta(sub?.status);
  const isPending = wl?.status === "pending";
  const isSuspended = wl?.status === "suspended" || isPending;
  const displayName = wl?.profile?.whitelabelData?.arabicName || wl?.username || "—";
  const englishName = wl?.profile?.whitelabelData?.englishName;

  const handleToggleStatus = async () => {
    // Phase 4b W1-WL-EMAIL: Approve flows through the new dialog so the
    // admin can confirm AND choose whether to dispatch the
    // setup-password email atomically. Suspend stays on the old confirm
    // path because there's no email side effect.
    if (isPending) {
      if (!sub) {
        toast.warning(t("actions.assignPlanFirst", "يجب تعيين خطة اشتراك قبل تنشيط الوايت ليبل"));
        setSubOpen(true);
        return;
      }
      setApproveOpen(true);
      return;
    }

    if (isSuspended && !sub) {
      toast.warning(t("actions.assignPlanFirst", "يجب تعيين خطة اشتراك قبل تنشيط الوايت ليبل"));
      setSubOpen(true);
      return;
    }
    const next = isSuspended ? "active" : "suspended";
    const msg  = isSuspended
      ? t("actions.confirmActivate", "هل أنت متأكد من تنشيط هذا الوايت ليبل؟")
      : t("actions.confirmSuspend",  "هل أنت متأكد من إيقاف هذا الوايت ليبل؟");
    if (!window.confirm(msg)) return;
    try {
      await updateStatus.mutateAsync({ whitelabelId: wl?.id || wl?._id, status: next });
      toast.success(isSuspended
        ? t("actions.activateSuccess", "تم تنشيط الوايت ليبل بنجاح")
        : t("actions.suspendSuccess",  "تم إيقاف الوايت ليبل بنجاح"));
      router.refresh();
    } catch {
      toast.error(isSuspended
        ? t("actions.activateError", "فشل في تنشيط الوايت ليبل")
        : t("actions.suspendError",  "فشل في إيقاف الوايت ليبل"));
    }
  };

  const handleConfirmApprove = async ({ dispatchSetupEmail }) => {
    try {
      const resp = await updateStatus.mutateAsync({
        whitelabelId: wl?.id || wl?._id,
        status: "active",
        dispatchSetupEmail,
      });
      const emailDispatch = resp?.data?.emailDispatch || resp?.emailDispatch;
      const emailSent = !!emailDispatch?.sent;
      const noEmailOnFile = emailDispatch?.error === "NO_EMAIL_ON_FILE";
      // B-R1 hardening — the backend declines to mint a new setup token
      // once the WL has completed setup, to close the re-approval
      // password-reset trapdoor. Surface a warning so the admin knows
      // to use the explicit password-reset flow instead.
      const passwordAlreadySet = emailDispatch?.error === "PASSWORD_ALREADY_SET";
      if (dispatchSetupEmail && emailSent) {
        toast.success(
          t(
            "approveWhitelabelDialog.successWithEmail",
            "تم تنشيط الحساب وإرسال رابط إعداد كلمة المرور بالبريد"
          )
        );
      } else if (dispatchSetupEmail && passwordAlreadySet) {
        toast.warning(
          t(
            "approveWhitelabelDialog.successPasswordAlreadySet",
            "تم تنشيط الحساب. كلمة المرور مُعَدَّة بالفعل — استخدم خيار إعادة تعيين كلمة المرور بدلاً من الموافقة."
          )
        );
      } else if (dispatchSetupEmail && noEmailOnFile) {
        toast.warning(
          t(
            "approveWhitelabelDialog.successNoEmailOnFile",
            "تم تنشيط الحساب لكن لا يوجد بريد إلكتروني مسجل. يرجى تحديث بيانات الحساب."
          )
        );
      } else if (dispatchSetupEmail && emailDispatch?.attempted && !emailSent) {
        toast.warning(
          t(
            "approveWhitelabelDialog.successEmailFailed",
            "تم تنشيط الحساب لكن تعذر إرسال البريد. يرجى إعادة المحاولة."
          )
        );
      } else {
        toast.success(
          t("actions.activateSuccess", "تم تنشيط الوايت ليبل بنجاح")
        );
      }
      setApproveOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err?.parsedError?.message ||
          err?.message ||
          t("actions.activateError", "فشل في تنشيط الوايت ليبل")
      );
    }
  };

  return (
    <>
      <div className={styles.page}>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.avatar}>
              {wl?.profile?.whitelabelData?.logo
                ? <img src={wl.profile.whitelabelData.logo} alt={displayName} className={styles.avatarImg} />
                : <FaBuilding size={28} />}
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.wlName}>{displayName}</h1>
              {englishName && <span className={styles.wlNameEn}>{englishName}</span>}
              <span className={styles.username}>@{wl?.username || "—"}</span>
              <span className={styles.statusPill} style={{ color: wlSt.color, background: wlSt.bg }}>
                {wlSt.label}
              </span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.btnPrimary} onClick={() => setSubOpen(true)}>
              <FaCrown size={15} />
              إدارة الاشتراك
            </button>
            <button
              className={isSuspended ? styles.btnSuccess : styles.btnDanger}
              onClick={handleToggleStatus}
              disabled={updateStatus.isPending}
            >
              {isPending
                ? t("actions.approve", "الموافقة على الحساب")
                : isSuspended
                  ? "تنشيط الحساب"
                  : "إيقاف الحساب"}
            </button>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className={styles.statsRow}>
          {[
            { icon: <FiUsers size={18} />,    label: "المضيفين",    value: stats.hostsCount ?? 0 },
            { icon: <FiCalendar size={18} />, label: "المناسبات",   value: stats.eventsCount ?? 0 },
            { icon: <FiShield size={18} />,   label: "المشرفين",    value: stats.moderatorsCount ?? 0 },
            { icon: <FiCreditCard size={18} />, label: "خطة الاشتراك", value: plan.label,
              valueStyle: { color: plan.color, background: plan.bg, padding: "0.2rem 0.9rem", borderRadius: "var(--r-full,9999px)", fontWeight: 600, fontSize: "1.2rem" } },
          ].map((s, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div>
                <div className={styles.statLabel}>{s.label}</div>
                {s.valueStyle
                  ? <span style={s.valueStyle}>{s.value}</span>
                  : <div className={styles.statValue}>{s.value}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Info + Subscription ── */}
        <div className={styles.twoCol}>

          {/* Contact */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>معلومات التواصل</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><FiPhone size={15} /></div>
                <div>
                  <div className={styles.infoLabel}>رقم الهاتف</div>
                  <div className={styles.infoValue}>{wl?.phoneNumber || "—"}</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><FiMail size={15} /></div>
                <div>
                  <div className={styles.infoLabel}>البريد الإلكتروني</div>
                  <div className={styles.infoValue}>{wl?.email || "—"}</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><FiClock size={15} /></div>
                <div>
                  <div className={styles.infoLabel}>تاريخ الانضمام</div>
                  <div className={styles.infoValue}>{fmtDate(wl?.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>تفاصيل الاشتراك</h3>
            {sub ? (
              <div className={styles.subGrid}>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>الخطة</span>
                  <span style={{ color: plan.color, background: plan.bg, padding: "0.25rem 0.9rem", borderRadius: "var(--r-full,9999px)", fontWeight: 600, fontSize: "1.2rem" }}>
                    {plan.label}
                  </span>
                </div>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>الحالة</span>
                  <span style={{ color: subSt.color, background: subSt.bg, padding: "0.25rem 0.9rem", borderRadius: "var(--r-full,9999px)", fontWeight: 600, fontSize: "1.2rem" }}>
                    {subSt.label}
                  </span>
                </div>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>حد أعضاء الفريق</span>
                  <span className={styles.subValue}>{limitLabel(sub?.limits?.maxUsers)}</span>
                </div>
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>حد المناسبات / شهر</span>
                  <span className={styles.subValue}>{limitLabel(sub?.limits?.maxEventsPerMonth)}</span>
                </div>
                {sub?.currentPeriodEnd && (
                  <div className={styles.subItem}>
                    <span className={styles.subLabel}>ينتهي في</span>
                    <span className={styles.subValue}>{fmtDate(sub.currentPeriodEnd)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.noPlan}>
                <FiCreditCard size={28} />
                <p>لم يتم تعيين خطة اشتراك بعد</p>
                <button className={styles.assignBtn} onClick={() => setSubOpen(true)}>
                  تعيين خطة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Hosts ── */}
        {hosts.length > 0 && (
          <div className={styles.hostsSection}>
            <h3 className={styles.sectionHeading}>
              المضيفين المسجلين
              <span className={styles.count}>{stats.hostsCount ?? hosts.length}</span>
            </h3>
            <div className={styles.hostsGrid}>
              {hosts.map((host) => {
                const hs = hostStatusMeta(host?.status);
                return (
                  <div key={host.id || host._id} className={styles.hostCard}>
                    <div className={styles.hostAvatarSmall}>
                      {initials(host?.name || host?.username)}
                    </div>
                    <div className={styles.hostInfo}>
                      <div className={styles.hostName}>{host?.name || host?.username || "—"}</div>
                      <div className={styles.hostEmail}>{host?.email || "—"}</div>
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
                      title="عرض التفاصيل"
                    >
                      <FiExternalLink size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Subscription Popup ── */}
      <PopupLayout isOpen={subOpen} onClose={() => setSubOpen(false)}>
        <WhitelabelSubscriptionPopup
          whitelabel={wl}
          currentSubscription={sub}
          onClose={() => setSubOpen(false)}
          onSuccess={() => { setSubOpen(false); router.refresh(); }}
        />
      </PopupLayout>

      {/* ── Approve Dialog (Phase 4b W1-WL-EMAIL / D5) ── */}
      <ApproveWhitelabelDialog
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleConfirmApprove}
        isPending={updateStatus.isPending}
        whitelabel={wl}
      />
    </>
  );
}
