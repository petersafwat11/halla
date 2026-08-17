"use client";

import React, { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useBusinessCheckoutSummary } from "@/hooks/business";
import styles from "../checkout.module.css";

const PENDING_STATUS = "pending_payment";

/**
 * Public post-payment status page for a hosted business checkout.
 *
 * There is no public poll endpoint (the host `/payments/:id/poll` is auth-only),
 * so we re-read the public summary: while it is still `pending_payment` the
 * payment hasn't completed; once the backend consumes/transitions the link the
 * summary endpoint throws (non-pending), which we treat as "payment received /
 * activation in progress" — the buyer's account is activated server-side and an
 * email confirmation follows.
 */
const BusinessCheckoutReturnPage = () => {
  const { t } = useTranslation("plans");
  const { token, lang } = useParams();
  const searchParams = useSearchParams();
  // Moyasar appends ?id=<paymentId> on 3DS return; surfaced for support, not
  // required for the status read.
  const paymentId = searchParams.get("id");

  const {
    data: summaryResponse,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBusinessCheckoutSummary(token, {
    // Keep checking briefly after a 3DS return while the webhook settles.
    refetchInterval: (query) => {
      const data = query?.state?.data;
      const status = data?.data?.status ?? data?.status;
      return status === PENDING_STATUS ? 4000 : false;
    },
  });

  const summary = useMemo(
    () => summaryResponse?.data ?? summaryResponse ?? null,
    [summaryResponse]
  );

  const stillPending = summary && summary.status === PENDING_STATUS;
  // Either an error (link consumed/expired) OR a non-pending status means the
  // checkout is no longer awaiting payment.
  const completed = !isLoading && (error || (summary && !stillPending));

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SimpleLoading message={t("business.checkout.return.confirming")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.stateCard}>
        {stillPending ? (
          <>
            <div className={styles.stateIcon}>⏳</div>
            <h2 className={styles.stateTitle}>
              {t("business.checkout.return.pendingTitle")}
            </h2>
            <p className={styles.stateText}>
              {t("business.checkout.return.pendingText")}
            </p>
            <button
              type="button"
              className={styles.payButton}
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching
                ? t("business.checkout.return.confirming")
                : t("business.checkout.return.recheck")}
            </button>
          </>
        ) : (
          <>
            <div className={styles.stateIcon}>✅</div>
            <h2 className={styles.stateTitle}>
              {t("business.checkout.return.doneTitle")}
            </h2>
            <p className={styles.stateText}>
              {t("business.checkout.return.doneText")}
            </p>
            <a
              href={`/${lang}/login`}
              className={styles.payButton}
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              {t("business.checkout.return.goToLogin")}
            </a>
          </>
        )}

        {paymentId && (
          <p className={styles.refText}>
            {t("business.checkout.return.reference")}: {paymentId}
          </p>
        )}
      </div>
    </div>
  );
};

export default BusinessCheckoutReturnPage;
