"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import styles from "./CopyableLink.module.css";

/**
 * CopyableLink — the one way the admin dashboard presents a generated link.
 *
 * A generated URL is an opaque LTR token: it must never wrap into the RTL flow,
 * never overflow its card, and always be one click from the clipboard. Both
 * link-generation surfaces (business checkout link, admin payment link) render
 * it through this component so the affordance and the copied feedback match.
 *
 * @param {string} props.url        The link to show. Renders nothing when empty.
 * @param {string} [props.label]    Field label above the value.
 * @param {string} [props.copyLabel]     Button text (default "Copy").
 * @param {string} [props.copiedLabel]   Button text after a successful copy.
 * @param {string} [props.hint]     Manual-copy fallback hint, shown until copied.
 * @param {Function} [props.onCopied] Called after a successful clipboard write.
 */
export default function CopyableLink({
  url,
  label,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  hint,
  onCopied,
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setCopied(false);
  }, [url]);

  if (!url) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked (permissions / insecure origin). The value
      // stays selectable, and the hint tells the admin to copy it by hand.
      setCopied(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <input
          className={styles.value}
          value={url}
          readOnly
          dir="ltr"
          spellCheck={false}
          onFocus={(event) => event.target.select()}
        />
        <button
          type="button"
          className={copied ? styles.copyBtnDone : styles.copyBtn}
          onClick={handleCopy}
        >
          {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      {hint && !copied && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
