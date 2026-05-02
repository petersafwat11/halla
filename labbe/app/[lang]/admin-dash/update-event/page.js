import { requirePageAccess } from "@/services/serverAuth";
import UpdateEventContent from "./_components/UpdateEventContent";
import styles from "./page.module.css";

export default async function AdminUpdateEventPage({ params, searchParams }) {
  const { lang } = await params;
  await requirePageAccess("events", lang);

  const resolvedSearchParams = await searchParams;
  const eventId = resolvedSearchParams?.id;

  return (
    <div className={styles.container}>
      <UpdateEventContent eventId={eventId} />
    </div>
  );
}
