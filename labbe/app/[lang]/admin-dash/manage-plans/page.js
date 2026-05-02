import { cookies } from "next/headers";
import { requirePageAccess } from "@/services/serverAuth";
import ManagePlansContent from "./_components/ManagePlansContent";
import styles from "./page.module.css";

export default async function AdminManagePlansPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("manage-plans", lang);

  return (
    <div className={styles.container}>
      <ManagePlansContent />
    </div>
  );
}
