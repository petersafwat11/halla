"use client";
import { useTicket } from "@/hooks/reactQueryHooks/useTickets";
import { useRouter } from "next/navigation";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import TicketDetailView from "../_components/TicketDetailView";
import styles from "./TicketDetailsContent.module.css";

export default function TicketDetailsContent({ ticketId }) {
  const router = useRouter();
  const { data, isLoading, error } = useTicket(ticketId);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error Loading Ticket</h2>
        <p>{error.message}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  const ticket = data?.data?.ticket || data?.data || data;

  return <TicketDetailView ticket={ticket} />;
}
