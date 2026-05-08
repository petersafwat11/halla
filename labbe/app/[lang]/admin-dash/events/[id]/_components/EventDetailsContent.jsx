"use client";
import { useSingleEventStats } from "@/hooks/events";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import AdminEventHeader from "../_components/AdminEventHeader";
import EventStats from "@/app/[lang]/host/events/[id]/_components/EventStats";
import AdminGuestTable from "../_components/AdminGuestTable";
import SubscriptionInfo from "../_components/SubscriptionInfo";
import styles from "./EventDetailsContent.module.css";

export default function EventDetailsContent({ eventId }) {
  const router = useRouter();
  const { t } = useTranslation("adminEvents");
  const { data, isLoading, error } = useSingleEventStats(eventId);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>{t("errors.loadingEvent", "Error Loading Event")}</h2>
        <p>{error.message}</p>
        <button onClick={() => router.back()}>{t("buttons.goBack", "Go Back")}</button>
      </div>
    );
  }

  const eventData = data.data;

  return (
    <>
      <AdminEventHeader data={eventData} />

      <div className={styles.contentWrapper}>
        {eventData?.subscription && (
          <SubscriptionInfo subscription={eventData.subscription} />
        )}

        <EventStats data={eventData} />

        <div className={styles.membersData}>
          <AdminGuestTable />
        </div>
      </div>
    </>
  );
}
