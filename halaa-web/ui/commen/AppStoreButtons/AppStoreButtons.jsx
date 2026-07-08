import Image from "next/image";
import styles from "./AppStoreButtons.module.css";

const labels = {
  ar: { apple: "تنزيل من", google: "احصل عليه من" },
  en: { apple: "Download on", google: "Get it on" },
};

/**
 * AppStoreButtons
 * @param {string}  lang          - "ar" | "en"
 * @param {string}  [appleHref]   - App Store link
 * @param {string}  [googleHref]  - Google Play link
 * @param {"row"|"column"} [direction] - layout direction (default "row")
 */
const AppStoreButtons = ({
  lang = "ar",
  appleHref = "#",
  googleHref = "#",
  direction = "row",
}) => {
  const t = labels[lang] || labels.ar;

  return (
    <div className={`${styles.wrap} ${direction === "column" ? styles.column : ""}`}>
      <a href={appleHref} className={styles.btn}>
        <Image
          src="/svg/apple-store.svg"
          alt="App Store"
          width={22}
          height={27}
          className={styles.icon}
        />
        <div className={styles.content}>
          <span className={styles.label}>{t.apple}</span>
          <span className={styles.name}>App Store</span>
        </div>
      </a>

      <a href={googleHref} className={styles.btn}>
        <Image
          src="/svg/google-store.svg"
          alt="Google Play"
          width={24}
          height={24}
          className={styles.icon}
        />
        <div className={styles.content}>
          <span className={styles.label}>{t.google}</span>
          <span className={styles.name}>Google Play</span>
        </div>
      </a>
    </div>
  );
};

export default AppStoreButtons;
