"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import styles from "./page.module.css";

export default function ShareButton({ label, copiedLabel, title }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title, url: window.location.href };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(data.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return <button type="button" className={styles.shareButton} onClick={share}><Share2 size={17} />{copied ? copiedLabel : label}</button>;
}
