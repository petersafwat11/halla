import { requirePageAccess } from "@/services/serverAuth";
import AdminCreateEvent from "./_components/AdminCreateEvent";
import styles from "./page.module.css";

export default async function CreateEventPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("events", lang);

  return (
    <div className={styles.container}>
      <AdminCreateEvent />
    </div>
  );
}
