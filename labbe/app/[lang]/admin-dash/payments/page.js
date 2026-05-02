import { requirePageAccess } from "@/services/serverAuth";
import styles from "./page.module.css";

export default async function PaymentsPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("payments", lang);

  return (
    <div className={styles.container}>
    </div>
  );
}
