// Shared building blocks for the single-event detail page (host + admin).
//
// Headers differ enough between host (mutation hooks, "edit guests" deep
// link) and admin (direct fetch via eventsAPI, host-name badge, hard
// delete) that they ship as two flavors here. Everything else is a
// single shared implementation that both pages import.

export { default as AutoReminderInfoText } from "./AutoReminderInfoText";
export { default as ScheduleReminderSection } from "./ScheduleReminderSection";
export { default as EventStats } from "./EventStats";
export { default as EventStatsAndTableWrapper } from "./EventStatsAndTableWrapper";
export { default as EventFailureBanner } from "./EventFailureBanner";
export { default as EventFailureBannerClient } from "./EventFailureBannerClient";
export { default as PartialFailureBanner } from "./PartialFailureBanner";
export { default as StaffTokensList } from "./StaffTokensList";
export { default as GuestTable } from "./GuestTable";
export { default as HostEventHeader } from "./HostEventHeader";
export { default as AdminEventHeader } from "./AdminEventHeader";
export { default as SubscriptionInfo } from "./SubscriptionInfo";
