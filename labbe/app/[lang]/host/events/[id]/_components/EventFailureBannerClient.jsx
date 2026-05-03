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
  // M-20: pass the current locale through so banner strings are rendered
  // in the user's selected language (was Arabic-only).
  const params = useParams();
  const lang = (params?.lang === "en" ? "en" : "ar");
  return <EventFailureBanner event={event} currentUser={user} lang={lang} />;
}
