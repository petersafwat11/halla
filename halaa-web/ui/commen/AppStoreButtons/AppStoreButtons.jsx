import Image from "next/image";
import styles from "./AppStoreButtons.module.css";

const labels = {
  ar: { apple: "تنزيل من", google: "احصل عليه من", comingSoon: "قريباً" },
  en: { apple: "Download on", google: "Get it on", comingSoon: "Coming soon" },
};

/**
 * AppStoreButtons
 * @param {string}  lang          - "ar" | "en"
 * @param {"row"|"column"} [direction] - layout direction (default "row")
 */
const AppStoreButtons = ({
  lang = "ar",
  direction = "row",
}) => {
  const t = labels[lang] || labels.ar;
  const stores = [
    {
      name: "App Store",
      label: t.apple,
      icon: "/svg/apple-store.svg",
      width: 22,
      height: 27,
    },
    {
      name: "Google Play",
      label: t.google,
      icon: "/svg/google-store.svg",
      width: 24,
      height: 24,
    },
  ];

  return (
    <div className={`${styles.wrap} ${direction === "column" ? styles.column : ""}`}>
      {stores.map((store) => (
        <div key={store.name} className={styles.buttonWithTooltip}>
          <button
            type="button"
            className={`${styles.btn} ${styles.disabled}`}
            aria-disabled="true"
            aria-label={`${store.name} — ${t.comingSoon}`}
          >
            <Image
              src={store.icon}
              alt=""
              width={store.width}
              height={store.height}
              className={styles.icon}
            />
            <span className={styles.content}>
              <span className={styles.label}>{store.label}</span>
              <span className={styles.name}>{store.name}</span>
            </span>
          </button>
          <span className={styles.tooltip} role="tooltip" aria-hidden="true">
            {t.comingSoon}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AppStoreButtons;
