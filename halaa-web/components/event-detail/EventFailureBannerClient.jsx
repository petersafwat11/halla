"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useEvent } from "@/hooks/events/queries/useEvent";
import EventFailureBanner from "./EventFailureBanner";
import useAuthStore from "@/stores/authStore";

export default function EventFailureBannerClient({ eventId }) {
  const { data: eventResp } = useEvent(eventId);
  const { user } = useAuthStore();
  const event = eventResp?.data?.event || eventResp?.event;
  // Pass the current locale so banner strings render in the user's
  // selected language.
  const params = useParams();
  const lang = (params?.lang === "en" ? "en" : "ar");
  return <EventFailureBanner event={event} currentUser={user} lang={lang} />;
}
