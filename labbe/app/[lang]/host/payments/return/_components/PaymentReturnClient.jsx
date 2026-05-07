"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const TERMINAL = new Set([
  "paid",
  "captured",
  "failed",
  "refunded",
  "voided",
  "partially_refunded",
]);

export default function PaymentReturnClient() {
  const { t } = useTranslation("hostPayments");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const pollRef = useRef(null);

  // Moyasar appends `id` and `status` to the callback URL; we accept either.
  const moyasarId = searchParams.get("id");
  const [status, setStatus] = useState("pending_3ds");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!moyasarId) {
      setError(t("return.missingId", "Payment reference missing"));
      return undefined;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await apiRequest({
          method: "GET",
          path: API_PATHS.hostPayments.poll3ds(moyasarId),
        });
        const payment = res?.data?.data || res?.data || res;
        if (cancelled) return;
        setStatus(payment.status);
        if (TERMINAL.has(payment.status)) {
          if (payment.status === "paid" || payment.status === "captured") {
            router.replace(`/${lang}/host/create-event`);
          }
          return;
        }
        if (++attempts < 30) {
          pollRef.current = setTimeout(poll, 2000);
        } else {
          setError(
            t(
              "return.timeout",
              "Still confirming your payment. We'll email you once it lands."
            )
          );
        }
      } catch (err) {
        setError(err?.message || t("return.error", "Failed to confirm payment"));
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [moyasarId, lang, router, t]);

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h1>{t("return.title", "Payment status")}</h1>
        <p style={{ color: "#c62828" }}>{error}</p>
        <button onClick={() => router.push(`/${lang}/host`)}>
          {t("return.backHome", "Back to dashboard")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>{t("return.title", "Payment status")}</h1>
      <p>{t(`return.status.${status}`, status)}</p>
      <SimpleLoading message={t("return.confirming", "Confirming with the bank…")} />
    </div>
  );
}
