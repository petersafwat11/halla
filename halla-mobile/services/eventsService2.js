/**
 * Façade re-exporting the events service surface from the per-domain
 * sub-services. Existing consumers can keep doing
 *   `import { foo } from '../services/eventsService2'`
 * or
 *   `import service from '../services/eventsService2'`
 * — the named re-exports preserve the first form, and the default
 * object preserves the second.
 */

import {
  getUserEventsWithStats,
  getEventStats,
  getEventById,
  getSingleEventStats,
  updateEventStep2,
  deleteEvent,
  bulkDeleteEvents,
  getSubscriptionInfo,
  formatEventForDisplay,
  formatGuestForDisplay,
  calculateResponseRate,
  groupGuestsByStatus,
} from "./eventsService.crud";
import {
  updateGuestList,
  addGuest,
  updateGuestStatus,
  deleteGuest,
  updateGuest,
  rotateGuestQr,
  revokeGuestAccess,
} from "./eventsService.guests";
import {
  updateStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  listStaffTokens,
  revokeStaffAccess,
} from "./eventsService.staff";
import {
  updateInvitationSettings,
  retryLaunch,
  updateLaunchSettings,
  sendTestMessage,
  updateEventDetails,
} from "./eventsService.settings";
import {
  exportEvents,
  exportEventGuests,
} from "./eventsService.exports";

export {
  getUserEventsWithStats,
  getEventStats,
  getEventById,
  getSingleEventStats,
  updateEventStep2,
  deleteEvent,
  bulkDeleteEvents,
  getSubscriptionInfo,
  formatEventForDisplay,
  formatGuestForDisplay,
  calculateResponseRate,
  groupGuestsByStatus,
  updateGuestList,
  addGuest,
  updateGuestStatus,
  deleteGuest,
  updateGuest,
  rotateGuestQr,
  revokeGuestAccess,
  updateStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  listStaffTokens,
  revokeStaffAccess,
  updateInvitationSettings,
  retryLaunch,
  updateLaunchSettings,
  sendTestMessage,
  updateEventDetails,
  exportEvents,
  exportEventGuests,
};

export default {
  getUserEventsWithStats,
  getEventStats,
  getEventById,
  getSingleEventStats,
  updateEventStep2,
  deleteEvent,
  bulkDeleteEvents,
  getSubscriptionInfo,
  formatEventForDisplay,
  formatGuestForDisplay,
  calculateResponseRate,
  groupGuestsByStatus,
  updateGuestList,
  addGuest,
  updateGuestStatus,
  deleteGuest,
  updateGuest,
  rotateGuestQr,
  revokeGuestAccess,
  updateStaffList,
  addStaff,
  updateStaff,
  deleteStaff,
  listStaffTokens,
  revokeStaffAccess,
  updateInvitationSettings,
  retryLaunch,
  updateLaunchSettings,
  sendTestMessage,
  updateEventDetails,
  exportEvents,
  exportEventGuests,
};
