"use client";

import { useCallback, useState } from "react";
import { useAdminWhitelabel, useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import SubscriptionAssignmentPopup from "../../../_components/SubscriptionAssignmentPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ApproveWhitelabelDialog from "@/ui/admin/whitelabels/ApproveWhitelabelDialog";
import WhitelabelHero from "./WhitelabelHero";
import WhitelabelQuickStats from "./WhitelabelQuickStats";
import WhitelabelContactInfo from "./WhitelabelContactInfo";
import WhitelabelSubscriptionInfo from "./WhitelabelSubscriptionInfo";
import WhitelabelHostsList from "./WhitelabelHostsList";
import { FiAlertCircle } from "react-icons/fi";
import styles from "./WhitelabelDetailsContent.module.css";

export default function WhitelabelDetailsContent({ whitelabelId }) {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation("adminWhitelabels");
  const { data, isLoading, error } = useAdminWhitelabel(whitelabelId);
  const updateStatus = useAdminWhitelabelMutation("updateStatus");
  const [subOpen, setSubOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  if (isLoading) return <SimpleLoading />;

  if (error) return (
    <div className={styles.errorState}>
      <FiAlertCircle size={40} />
      <p>{t("errors.loadFailed", "Failed to load data")}</p>
      <button onClick={() => router.back()}>{t("actions.back", "Back")}</button>
    </div>
  );

  const wl    = data?.data?.whitelabel || data?.data || data;
  const sub   = wl?.subscription;
  const stats = wl?.statistics || {};
  const hosts = wl?.recentHosts || [];
  const isPending = wl?.status === "pending";
  const isSuspended = wl?.status === "suspended" || isPending;

  const handleToggleStatus = useCallback(async () => {
    if (isPending) {
      if (!sub) {
        toastUtils.warning(t("actions.assignPlanFirst"));
        setSubOpen(true);
        return;
      }
      setApproveOpen(true);
      return;
    }

    if (isSuspended && !sub) {
      toastUtils.warning(t("actions.assignPlanFirst"));
      setSubOpen(true);
      return;
    }
    const next = isSuspended ? "active" : "suspended";
    const msg  = isSuspended
      ? t("actions.confirmActivate")
      : t("actions.confirmSuspend");
    if (!window.confirm(msg)) return;
    try {
      await updateStatus.mutateAsync({ whitelabelId: wl?.id || wl?._id, status: next });
      toastUtils.success(isSuspended
        ? t("actions.activateSuccess")
        : t("actions.suspendSuccess"));
      router.refresh();
    } catch (err) {
      handleError(err, t, { fallbackMessage: isSuspended ? "actions.activateError" : "actions.suspendError" });
    }
  }, [isPending, isSuspended, sub, wl, updateStatus, t, router]);

  const handleConfirmApprove = useCallback(async ({ dispatchSetupEmail }) => {
    try {
      const resp = await updateStatus.mutateAsync({
        whitelabelId: wl?.id || wl?._id,
        status: "active",
        dispatchSetupEmail,
      });
      const emailDispatch = resp?.data?.emailDispatch || resp?.emailDispatch;
      const emailSent = !!emailDispatch?.sent;
      const noEmailOnFile = emailDispatch?.error === "NO_EMAIL_ON_FILE";
      const passwordAlreadySet = emailDispatch?.error === "PASSWORD_ALREADY_SET";
      if (dispatchSetupEmail && emailSent) {
        toastUtils.success(t("approveWhitelabelDialog.successWithEmail"));
      } else if (dispatchSetupEmail && passwordAlreadySet) {
        toastUtils.warning(t("approveWhitelabelDialog.successPasswordAlreadySet"));
      } else if (dispatchSetupEmail && noEmailOnFile) {
        toastUtils.warning(t("approveWhitelabelDialog.successNoEmailOnFile"));
      } else if (dispatchSetupEmail && emailDispatch?.attempted && !emailSent) {
        toastUtils.warning(t("approveWhitelabelDialog.successEmailFailed"));
      } else {
        toastUtils.success(t("actions.activateSuccess"));
      }
      setApproveOpen(false);
      router.refresh();
    } catch (err) {
      handleError(err, t, { fallbackMessage: "actions.activateError" });
    }
  }, [wl, updateStatus, t, router]);

  return (
    <>
      <div className={styles.page}>
        <WhitelabelHero
          wl={wl}
          onManageSubscription={() => setSubOpen(true)}
          onToggleStatus={handleToggleStatus}
          isPending={isPending}
          isSuspended={isSuspended}
          updateStatusPending={updateStatus.isPending}
          t={t}
        />

        <WhitelabelQuickStats stats={stats} sub={sub} t={t} />

        <div className={styles.twoCol}>
          <WhitelabelContactInfo wl={wl} t={t} />
          <WhitelabelSubscriptionInfo
            sub={sub}
            onAssignPlan={() => setSubOpen(true)}
            t={t}
          />
        </div>

        <WhitelabelHostsList
          hosts={hosts}
          stats={stats}
          lang={lang}
          router={router}
          t={t}
        />
      </div>

      {subOpen && (
        <SubscriptionAssignmentPopup
          entity={wl}
          entityType="whitelabel"
          onClose={() => { setSubOpen(false); router.refresh(); }}
        />
      )}

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
