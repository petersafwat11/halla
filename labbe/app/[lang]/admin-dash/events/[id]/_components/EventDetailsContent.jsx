"use client";
import { useSingleEventStats } from "@/hooks/events";
import { useRouter } from "next/navigation";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import AdminEventHeader from "../_components/AdminEventHeader";
import EventStats from "@/app/[lang]/host/events/[id]/_components/EventStats";
import AdminGuestTable from "../_components/AdminGuestTable";
import SubscriptionInfo from "../_components/SubscriptionInfo";
import styles from "./EventDetailsContent.module.css";

export default function EventDetailsContent({ eventId }) {
  const router = useRouter();
  const { data, isLoading, error } = useSingleEventStats(eventId);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error Loading Event</h2>
        <p>{error.message}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  const eventData = data?.data || data;

  return (
    <>
      <AdminEventHeader data={eventData} />

      <div className={styles.contentWrapper}>
        {eventData?.subscription && (
          <SubscriptionInfo subscription={eventData.subscription} />
        )}

        <EventStats data={eventData} />

        <div className={styles.membersData}>
          <AdminGuestTable data={eventData} />
        </div>
      </div>
    </>
  );
}
