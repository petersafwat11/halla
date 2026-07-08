import React from "react";
import styles from "./page.module.css";
import CardsWrapper from "./_components/cardsWrapper/CardsWrapper";
import { cookies } from "next/headers";
import EventsTable from "./_components/EventsTable";
import Header from "./_components/header/Header";
import {
  createServerQueryClient,
  prefetchServerData,
  QueryClientServerProvider,
} from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

const page = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    try {
      // Prefetch events stats
      await prefetchServerData({
        queryClient,
        queryKey: ["events", "stats"],
        path: API_PATHS.events.getEventStats,
        token,
      });

      // Prefetch my events list
      await prefetchServerData({
        queryClient,
        queryKey: ["events", "my-events"],
        path: API_PATHS.events.getMyEvents,
        token,
      });
    } catch (error) {
      console.error("Error prefetching events data:", error.message);
    }
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <div className={styles.page}>
        <Header />
        {/* Cards and Chart Section */}
        <div className={styles.quickLook}>
          <CardsWrapper />
          {/* <Chart data={data} /> */}
        </div>

        {/* Guest Table Section */}
        <div className={styles.tableSection}>
          <EventsTable />
        </div>
      </div>
    </QueryClientServerProvider>
  );
};

export default page;
