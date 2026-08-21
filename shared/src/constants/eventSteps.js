/**
 * Event Wizard Step Constants
 * Canonical definitions of event creation and update step sequences across web and mobile.
 */

/**
 * Host create wizard steps (5 steps)
 */
export const EVENT_CREATE_STEPS = Object.freeze([
  "details",
  "guests_staff",
  "visual_template",
  "messages",
  "review",
]);

export const EVENT_CREATE_STEP_NUMBERS = Object.freeze({
  DETAILS: 1,
  GUESTS_STAFF: 2,
  VISUAL_TEMPLATE: 3,
  MESSAGES: 4,
  REVIEW: 5,
});

/**
 * Admin create wizard steps (6 steps: starts with host selector)
 */
export const ADMIN_EVENT_CREATE_STEPS = Object.freeze([
  "host_selector",
  "details",
  "guests_staff",
  "visual_template",
  "messages",
  "review",
]);

export const ADMIN_EVENT_CREATE_STEP_NUMBERS = Object.freeze({
  HOST_SELECTOR: 1,
  DETAILS: 2,
  GUESTS_STAFF: 3,
  VISUAL_TEMPLATE: 4,
  MESSAGES: 5,
  REVIEW: 6,
});

/**
 * Event update wizard steps (4 steps)
 */
export const EVENT_UPDATE_STEPS = Object.freeze([
  "details",
  "guests_staff",
  "visual_template",
  "messages",
]);

export const EVENT_UPDATE_STEP_NUMBERS = Object.freeze({
  DETAILS: 1,
  GUESTS_STAFF: 2,
  VISUAL_TEMPLATE: 3,
  MESSAGES: 4,
});
