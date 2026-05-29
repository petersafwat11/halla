"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePoll3DS } from "@/hooks/payments";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./PaymentReturnClient.module.css";

const PURPOSE_REDIRECT = (lang, purpose) => {
  switch (purpose) {
    case "subscription":
      return `/${lang}/host/subscription`;
    case "addon":
      return `/${lang}/host/events`;
    case "checkout":
      return `/${lang}/host/create-event`;
    default:
      return `/${lang}/host`;
  }
};

const SUCCESS_STATUSES = new Set(["paid", "captured"]);

export default function PaymentReturnClient() {
  const { t } = useTranslation("hostPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const moyasarId = searchParams.get("id");

  const {
    payment,
    status,
    isTerminal,
    reachedMaxAttempts,
    isError,
    error,
  } = usePoll3DS(moyasarId);

  useEffect(() => {
    if (!isTerminal || !payment) return;
    if (SUCCESS_STATUSES.has(status)) {
      const target = PURPOSE_REDIRECT(lang, payment.metadata?.purpose);
      router.replace(target);
    }
  }, [isTerminal, status, payment, lang, router]);

  if (!moyasarId) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {t("return.title", "Payment status")}
        </h1>
        <p className={styles.error}>
          {t("return.missingId", "Payment reference missing")}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${lang}/host`)}
          className={styles.backBtn}
        >
          {t("return.backHome", "Back to dashboard")}
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {t("return.title", "Payment status")}
        </h1>
        <p className={styles.error}>
          {error?.message || t("return.error", "Failed to confirm payment")}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${lang}/host`)}
          className={styles.backBtn}
        >
          {t("return.backHome", "Back to dashboard")}
        </button>
      </div>
    );
  }

  if (reachedMaxAttempts) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {t("return.title", "Payment status")}
        </h1>
        <p className={styles.statusLine}>
          {t(
            "return.timeout",
            "Still confirming your payment. We'll email you once it lands."
          )}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${lang}/host`)}
          className={styles.backBtn}
        >
          {t("return.backHome", "Back to dashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("return.title", "Payment status")}</h1>
      <p className={styles.statusLine}>
        {status
          ? t(`return.status.${status}`, status)
          : t("return.confirming", "Confirming with the bank…")}
      </p>
      <SimpleLoading
        message={t("return.confirming", "Confirming with the bank…")}
      />
    </div>
  );
}
