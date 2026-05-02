"use client";

import { useState } from "react";
import { useAdminHost, useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import SubscriptionPopup from "../../_components/subscriptionPopup/SubscriptionPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import {
  FiMail, FiPhone, FiCalendar, FiClock,
  FiShield, FiUsers, FiCreditCard, FiAlertCircle,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import styles from "./HostDetailsContent.module.css";

/* ─── helpers ─── */
const initials = (name) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const planMeta = (planType) => {
  if (!planType || planType === "trial")
    return { label: "Trial", color: "var(--c-n400)", bg: "var(--c-n200)" };
  if (planType.startsWith("single_")) {
    const n = planType.replace("single_", "").replace("_plus", "+");
    return { label: `Single ${n}`, color: "#3498DB", bg: "#e8f4fd" };
  }
  const map = {
    lite:  { label: "Lite",  color: "#9B59B6", bg: "#f5eef8" },
    pro:   { label: "Pro",   color: "var(--c-p600)", bg: "var(--c-p50)" },
    elite: { label: "Elite", color: "var(--c-error-500,#c0392b)", bg: "var(--c-error-50,#f9ebea)" },
  };
  return map[planType] || { label: planType, color: "var(--c-n400)", bg: "var(--c-n200)" };
};

const subStatusMeta = (status) => ({
  active:   { label: "نشط",      color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  trial:    { label: "تجريبي",   color: "#9B59B6",                      bg: "#f5eef8" },
  expired:  { label: "منتهي",    color: "var(--c-error-500,#c0392b)",   bg: "var(--c-error-50,#f9ebea)" },
  cancelled:{ label: "ملغي",     color: "var(--c-n400)",                bg: "var(--c-n200)" },
}[status] || { label: status || "—", color: "var(--c-n400)", bg: "var(--c-n200)" });

const hostStatusMeta = (status) => ({
  active:    { label: "نشط",    color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  suspended: { label: "موقوف", color: "var(--c-error-500,#c0392b)",   bg: "var(--c-error-50,#f9ebea)" },
  inactive:  { label: "غير نشط", color: "var(--c-n400)",             bg: "var(--c-n200)" },
}[status] || { label: status || "—", color: "var(--c-n400)", bg: "var(--c-n200)" });

const eventStatusMeta = (status) => ({
  scheduled: { label: "مجدول",  color: "var(--c-warning-500,#d38200)", bg: "var(--c-warning-50,#fbf3e6)" },
  live:      { label: "مباشر",  color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  completed: { label: "منتهي",  color: "var(--c-n400)",                bg: "var(--c-n200)" },
  draft:     { label: "مسودة",  color: "var(--c-n400)",                bg: "var(--c-n200)" },
}[status] || { label: status || "—", color: "var(--c-n400)", bg: "var(--c-n200)" });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "—";

/* ─── component ─── */
export default function HostDetailsContent({ hostId }) {
  const router = useRouter();
  const { t } = useTranslation("adminHosts");
  const { data, isLoading, error } = useAdminHost(hostId);
  const updateStatus = useAdminHostMutation("updateStatus");
  const [subOpen, setSubOpen] = useState(false);

  if (isLoading) return <SimpleLoading />;

  if (error) return (
    <div className={styles.errorState}>
      <FiAlertCircle size={40} />
      <p>{error.message}</p>
      <button onClick={() => router.back()}>العودة</button>
    </div>
  );

  const host = data?.data?.host || data?.data || data;
  const sub  = host?.subscription;
  const events = host?.events || [];
  const plan = planMeta(sub?.planType);
  const hStatus = hostStatusMeta(host?.status);
  const subStatus = subStatusMeta(sub?.status);
  const isSuspended = host?.status === "suspended";

  const handleToggleStatus = async () => {
    const next = isSuspended ? "active" : "suspended";
    const msg  = isSuspended
      ? t("actions.confirmActivate", "هل أنت متأكد من تنشيط هذا المضيف؟")
      : t("actions.confirmSuspend",  "هل أنت متأكد من إيقاف هذا المضيف؟");
    if (!window.confirm(msg)) return;
    try {
      await updateStatus.mutateAsync({ hostId: host?.id || host?._id, status: next });
      toast.success(isSuspended
        ? t("actions.activateSuccess", "تم تنشيط المضيف بنجاح")
        : t("actions.suspendSuccess",  "تم إيقاف المضيف بنجاح"));
      router.refresh();
    } catch {
      toast.error(isSuspended
        ? t("actions.activateError", "فشل في تنشيط المضيف")
        : t("actions.suspendError",  "فشل في إيقاف المضيف"));
    }
  };

  return (
    <>
      <div className={styles.page}>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.avatar}>{initials(host?.name || host?.username)}</div>
            <div className={styles.heroInfo}>
              <h1 className={styles.hostName}>{host?.name || host?.username || "—"}</h1>
              <span className={styles.username}>@{host?.username || "—"}</span>
              <span className={styles.statusPill} style={{ color: hStatus.color, background: hStatus.bg }}>
                {hStatus.label}
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
              {isSuspended ? "تنشيط الحساب" : "إيقاف الحساب"}
            </button>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className={styles.statsRow}>
          {[
            { icon: <FiCalendar size={18} />, label: "المناسبات",    value: events.length },
            { icon: <FiCreditCard size={18} />, label: "خطة الاشتراك", value: plan.label,
              valueStyle: { color: plan.color, background: plan.bg, padding: "0.2rem 0.9rem", borderRadius: "var(--r-full)", fontWeight: 600, fontSize: "1.2rem" } },
            { icon: <FiUsers size={18} />,    label: "حد الضيوف",    value: sub?.limits?.maxGuestsPerEvent || "—" },
            { icon: <FiShield size={18} />,   label: "حالة الاشتراك", value: subStatus.label,
              valueStyle: { color: subStatus.color, background: subStatus.bg, padding: "0.2rem 0.9rem", borderRadius: "var(--r-full)", fontWeight: 600, fontSize: "1.2rem" } },
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
                  <div className={styles.infoValue}>{host?.phoneNumber || "—"}</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><FiMail size={15} /></div>
                <div>
                  <div className={styles.infoLabel}>البريد الإلكتروني</div>
                  <div className={styles.infoValue}>{host?.email || "—"}</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><FiClock size={15} /></div>
                <div>
                  <div className={styles.infoLabel}>تاريخ الانضمام</div>
                  <div className={styles.infoValue}>{fmtDate(host?.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>تفاصيل الاشتراك</h3>
            <div className={styles.subGrid}>
              <div className={styles.subItem}>
                <span className={styles.subLabel}>الخطة</span>
                <span style={{ color: plan.color, background: plan.bg, padding: "0.25rem 0.9rem", borderRadius: "var(--r-full)", fontWeight: 600, fontSize: "1.2rem" }}>
                  {plan.label}
                </span>
              </div>
              <div className={styles.subItem}>
                <span className={styles.subLabel}>الحالة</span>
                <span style={{ color: subStatus.color, background: subStatus.bg, padding: "0.25rem 0.9rem", borderRadius: "var(--r-full)", fontWeight: 600, fontSize: "1.2rem" }}>
                  {subStatus.label}
                </span>
              </div>
              <div className={styles.subItem}>
                <span className={styles.subLabel}>حد المناسبات</span>
                <span className={styles.subValue}>{sub?.limits?.maxEvents || "—"}</span>
              </div>
              <div className={styles.subItem}>
                <span className={styles.subLabel}>حد الضيوف / مناسبة</span>
                <span className={styles.subValue}>{sub?.limits?.maxGuestsPerEvent || "—"}</span>
              </div>
              {sub?.currentPeriodEnd && (
                <div className={styles.subItem}>
                  <span className={styles.subLabel}>ينتهي في</span>
                  <span className={styles.subValue}>{fmtDate(sub.currentPeriodEnd)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Events ── */}
        {events.length > 0 && (
          <div className={styles.eventsSection}>
            <h3 className={styles.sectionHeading}>
              المناسبات
              <span className={styles.count}>{events.length}</span>
            </h3>
            <div className={styles.eventsGrid}>
              {events.map((ev) => {
                const es = eventStatusMeta(ev?.status);
                return (
                  <div key={ev.id || ev._id} className={styles.eventCard}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventTitle}>{ev.title || "بدون عنوان"}</span>
                      <span className={styles.eventBadge} style={{ color: es.color, background: es.bg }}>
                        {es.label}
                      </span>
                    </div>
                    {ev.date && (
                      <div className={styles.eventDate}>
                        <FiCalendar size={13} />
                        {fmtDate(ev.date)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Subscription Popup ── */}
      <PopupLayout isOpen={subOpen} onClose={() => setSubOpen(false)}>
        <SubscriptionPopup
          host={host}
          currentSubscription={sub}
          onClose={() => setSubOpen(false)}
          onSuccess={() => { setSubOpen(false); router.refresh(); }}
        />
      </PopupLayout>
    </>
  );
}
