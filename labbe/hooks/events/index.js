// ============================================
// EVENTS HOOKS - Barrel Export
// ============================================

export { eventsKeys } from "./keys";

// Queries
export { useMyEvents } from "./queries/useMyEvents";
export { useEventStats } from "./queries/useEventStats";
export { useEvent } from "./queries/useEvent";
export { useSingleEventStats } from "./queries/useSingleEventStats";
export { useEventGuests } from "./queries/useEventGuests";
export { useSubscriptionInfo } from "./queries/useSubscriptionInfo";

// Mutations
export { useEventMutation } from "./mutations/useEventMutation";
export {
    useCreateEvent,
    useUpdateEventDetails,
    useUpdateGuestList,
    useUpdateStaffList,
    // Atomic guest+staff update for the unified update wizard's step 2.
    useUpdateEventStep2,
    useUpdateInvitationSettings,
    useUpdateLaunchSettings,
    useUpdateReminderSettings,
    useRetryLaunch,
    useResendInvite,
    useExtraReminder,
    useSendNewGuests,
} from "./mutations/useEventMutation";

// Form Management
export {
    useEventForm,
    transformGuestList,
    transformStaffList,
    mapEventToFormValues,
    buildEventPayload,
} from "./useEventForm";

// Re-export useEventById for convenience
export { useEventById } from "./queries/useEvent";
export { useEventSubscriptionInfo } from "./queries/useSubscriptionInfo";

// For backward compatibility - also export from reactQueryHooks location
// Use: import { useMyEvents } from "@/hooks/events";
