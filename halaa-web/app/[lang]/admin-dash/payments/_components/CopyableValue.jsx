"use client";
import { FiCopy } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./PaymentDetailPopup.module.css";

/** Truncated LTR identifier/URL with a copy button. Raw provider values never
 *  overflow the popup and stay selectable via the title attribute. */
export default function CopyableValue({ value, fallback = "—" }) {
  const { t } = useTranslation("adminPayments");
  if (!value) return <span className={styles.rowValue}>{fallback}</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toastUtils.success(t("links.create.copied", "Copied"));
    } catch {
      toastUtils.error(
        t("links.create.copyHint", "Copy failed — select the URL manually from details.")
      );
    }
  };

  return (
    <span className={styles.copyRow}>
      <span className={styles.copyValue} dir="ltr" title={value}>
        {value}
      </span>
      <button
        type="button"
        className={styles.copyBtn}
        onClick={copy}
        aria-label={t("actions.copy", "Copy")}
        title={t("actions.copy", "Copy")}
      >
        <FiCopy size={15} />
      </button>
    </span>
  );
}
