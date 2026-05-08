/**
 * Façade re-exporting the per-domain event mutation hooks. Existing
 * `import { useFoo } from '../../hooks/mutations/useEventMutations'`
 * call sites continue to resolve unchanged.
 */

export {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpdateEventStep2,
} from "./useEventCrudMutations";

export { useUpdateGuestList } from "./useEventGuestMutations";

export { useNotifyStaff } from "./useEventStaffMutations";

export {
  useUpdateInvitationSettings,
  useUpdateLaunchSettings,
  useUpdateVisualTemplate,
  useUpdateTaqnyatTemplate,
  useUpdateMessagingContent,
} from "./useEventSettingsMutations";

export {
  useSendTestMessage,
  useScheduleSend,
  useSendBulkInvitations,
  useRetryFailed,
  useSendReminder,
} from "./useMessagingMutations";
