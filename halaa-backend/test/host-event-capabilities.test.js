const test = require('node:test');
const assert = require('node:assert/strict');
const { eventActionCapabilities } = require('../src/modules/events/eventActionCapabilities');

const expected = {
  pending_review: ['canEditDetails', 'canEditDesign', 'canEditMessages', 'canAddGuest', 'canEditGuest', 'canDeleteGuest', 'canManageStaff'],
  pending_scheduling: ['canEditDetails', 'canEditDesign', 'canEditMessages', 'canAddGuest', 'canEditGuest', 'canDeleteGuest', 'canManageStaff', 'canSendTest', 'canSchedule'],
  scheduled: ['canEditDetails', 'canEditDesign', 'canEditMessages', 'canAddGuest', 'canEditGuest', 'canDeleteGuest', 'canManageStaff', 'canSendTest', 'canSchedule', 'canNotifyStaff', 'canRetryLaunch'],
  live: ['canAddGuest', 'canManageStaff', 'canNotifyStaff', 'canSendLiveMessages'],
  completed: ['canManageGuestAccess'],
  failed: ['canRetryLaunch'], cancelled: [], archived: [], deleted: [],
};
for (const [status, enabled] of Object.entries(expected)) {
  test(`Host event capabilities: ${status}`, () => {
    const result = eventActionCapabilities({ status });
    assert.deepEqual(Object.keys(result).filter(key => result[key] === true).sort(), [...enabled].sort());
    for (const [key, value] of Object.entries(result)) {
      if (value === false) assert.equal(result.denialReasons[key], 'EVENT_LIFECYCLE_CONFLICT');
    }
  });
}
