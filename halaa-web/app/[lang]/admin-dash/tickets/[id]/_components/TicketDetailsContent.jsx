"use client";

import { useTicket } from "@/hooks/tickets";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import TicketDetailView from "../_components/TicketDetailView";
import styles from "./TicketDetailsContent.module.css";

export default function TicketDetailsContent({ ticketId }) {
  const router = useRouter();
  const { t } = useTranslation("adminTickets");
  const { data, isLoading, error } = useTicket(ticketId);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>{t("errors.loadFailed", "Failed to load ticket details")}</h2>
        <button onClick={() => router.back()}>{t("actions.back", "Back")}</button>
      </div>
    );
  }

  const ticket = data?.data?.ticket;

  return <TicketDetailView ticket={ticket} />;
}
