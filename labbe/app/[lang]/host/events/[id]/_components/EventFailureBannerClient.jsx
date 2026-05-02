"use client";

import React from "react";
import { useEvent } from "@/hooks/events/queries/useEvent";
import EventFailureBanner from "./EventFailureBanner";
import useAuthStore from "@/stores/authStore";

export default function EventFailureBannerClient({ eventId }) {
  const { data: eventResp } = useEvent(eventId);
  const { user } = useAuthStore();
  const event = eventResp?.data?.event || eventResp?.event;
  return <EventFailureBanner event={event} currentUser={user} />;
}
