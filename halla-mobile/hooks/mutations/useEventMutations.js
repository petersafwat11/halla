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
  useSubmitTemplate,
  useSendTestMessage,
  useScheduleSend,
  useSendBulkInvitations,
  useRetryFailed,
  useUpdateInvitationSettings,
  useUpdateLaunchSettings,
  useUpdateVisualTemplate,
  useUpdateTaqnyatTemplate,
  useUpdateMessagingContent,
  useSendReminder,
} from "./useEventSettingsMutations";
