"use client";
import React, { useState, useRef, useCallback } from "react";
import EventStats from "./EventStats";
import GuestTable from "./GuestTable";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";

export default function EventStatsAndTableWrapper({ eventId }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const tableRef = useRef(null);

  const handleFilterPress = useCallback((filterKey) => {
    setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div>
      <div className={styles.statsData}>
        <EventStats
          eventId={eventId}
          activeFilter={statusFilter}
          onFilterPress={handleFilterPress}
        />
      </div>
      <div
        className={styles.guestsTable}
        ref={tableRef}
        style={{ scrollMarginTop: "24px" }}
      >
        <GuestTable eventId={eventId} statusFilter={statusFilter} onStatusFilterChange={handleFilterPress} />
      </div>
    </div>
  );
}
