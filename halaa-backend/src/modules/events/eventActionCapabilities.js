const { EVENT_LIFECYCLE_ALLOWED: allowed } = require('../../shared/constants/status');

const actionRules = Object.freeze({
  canEditDetails: 'DETAILS_MUTATION',
  canEditDesign: 'INVITATION_SETTINGS_MUTATION',
  canEditMessages: 'INVITATION_SETTINGS_MUTATION',
  canAddGuest: 'STAFF_MUTATION',
  canEditGuest: 'DETAILS_MUTATION',
  canDeleteGuest: 'DETAILS_MUTATION',
  canManageStaff: 'STAFF_MUTATION',
  canNotifyStaff: 'STAFF_NOTIFY',
  canSendTest: 'TEST_MESSAGE',
  canSchedule: 'SCHEDULE',
  canSendLiveMessages: 'LIVE_SEND',
  canRetryLaunch: 'MANUAL_LAUNCH_RETRY',
  canManageGuestAccess: 'POST_EVENT_PUBLISH',
});

// Scope/ownership is checked before returning event detail. These are lifecycle
// permissions; quota, successful test and other request prerequisites still apply.
function eventActionCapabilities(event) {
  const result = { denialReasons: {} };
  for (const [action, rule] of Object.entries(actionRules)) {
    result[action] = allowed[rule].includes(event.status);
    if (!result[action]) result.denialReasons[action] = 'EVENT_LIFECYCLE_CONFLICT';
  }
  return result;
}

module.exports = { eventActionCapabilities, actionRules };
