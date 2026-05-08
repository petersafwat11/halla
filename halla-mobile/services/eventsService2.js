/**
 * Façade re-exporting the events service surface from the per-domain
 * sub-services. Existing consumers can keep doing
 *   `import { foo } from '../services/eventsService2'`
 * or
 *   `import service from '../services/eventsService2'`
 * — the named re-exports preserve the first form, and the default
 * object preserves the second.
 *
 * Per-guest CRUD (`addGuest`, `updateGuest`, `deleteGuest`,
 * `rotateGuestQr`, `revokeGuestAccess`, `exportEventGuests`) lives in
 * `services/guestsService.js` and hits the canonical `/guests/...`
 * mount. Only the bulk `updateGuestList` (events-module) re-exports here.
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
import { updateGuestList } from "./eventsService.guests";
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
import { exportEvents } from "./eventsService.exports";

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
};
