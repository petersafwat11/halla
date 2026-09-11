"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./PaymentsTabs.module.css";

export default function PaymentsTabs() {
  const { t } = useTranslation("adminPayments");
  const pathname = usePathname();
  const params = useParams();
  const lang = params?.lang || "ar";
  const base = `/${lang}/admin-dash/payments`;
  const isLinks = pathname?.includes("/payments/links");

  return (
    <nav className={styles.tabs} aria-label={t("tabs.label", "Payments sections")}>
      <Link
        href={base}
        className={`${styles.tab} ${!isLinks ? styles.active : ""}`}
        aria-current={!isLinks ? "page" : undefined}
      >
        {t("tabs.transactions", "Transactions")}
      </Link>
      <Link
        href={`${base}/links`}
        className={`${styles.tab} ${isLinks ? styles.active : ""}`}
        aria-current={isLinks ? "page" : undefined}
      >
        {t("tabs.paymentLinks", "Payment links")}
      </Link>
    </nav>
  );
}
