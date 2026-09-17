"use client";

import { getPaymentMark } from "@halaa/shared/brand/paymentMarks";
import styles from "./PaymentBrandMark.module.css";

// The card networks ship as official vendor artwork; serving the files keeps
// them cacheable and out of the JS bundle. The shared module carries the same
// paths for mobile — see its provenance note.
const VECTOR_SRC = {
  visa: "/svg/payment/visa.svg",
  mastercard: "/svg/payment/mastercard.svg",
  mada: "/svg/payment/mada.svg",
};

const WEIGHT_CLASS = {
  bold: styles.wordBold,
  regular: styles.wordRegular,
  light: styles.wordLight,
};

/**
 * A payment brand mark, defined once in `@halaa/shared/brand/paymentMarks` so
 * web and mobile show the same logos.
 *
 * @param {string} brand - a key from PAYMENT_MARKS
 * @param {boolean} [chip] - wrap in the white chip that lines marks up in a row
 */
export default function PaymentBrandMark({ brand, chip = false, className = "" }) {
  const mark = getPaymentMark(brand);
  if (!mark) return null;

  const art =
    mark.kind === "vector" ? (
      <img
        src={VECTOR_SRC[brand]}
        alt={mark.label}
        className={styles.vector}
        loading="lazy"
      />
    ) : (
      <span
        className={styles.wordmark}
        style={{ color: mark.color }}
        role="img"
        aria-label={mark.label}
      >
        {mark.glyph ? (
          <svg
            className={styles.glyph}
            viewBox={mark.glyph.viewBox}
            aria-hidden="true"
            focusable="false"
          >
            <path d={mark.glyph.d} fill="currentColor" />
          </svg>
        ) : null}
        {mark.words.map((word) => (
          <span key={word.text} className={WEIGHT_CLASS[word.weight]}>
            {word.text}
          </span>
        ))}
      </span>
    );

  if (!chip) return <span className={`${styles.plain} ${className}`.trim()}>{art}</span>;

  return <span className={`${styles.chip} ${className}`.trim()}>{art}</span>;
}
