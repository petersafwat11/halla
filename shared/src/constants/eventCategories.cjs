"use strict";

/** Canonical event-category catalog shared by backend, web, and mobile. */
const EVENT_CATEGORIES = Object.freeze([
  Object.freeze({ code: "wedding", labelKey: "event_types.wedding", icon: "💍" }),
  Object.freeze({ code: "engagement", labelKey: "event_types.engagement", icon: "💐" }),
  Object.freeze({ code: "birthday", labelKey: "event_types.birthday", icon: "🎂" }),
  Object.freeze({ code: "graduation", labelKey: "event_types.graduation", icon: "🎓" }),
  Object.freeze({ code: "meeting", labelKey: "event_types.meeting", icon: "👥" }),
  Object.freeze({ code: "conference", labelKey: "event_types.conference", icon: "🎤" }),
  Object.freeze({ code: "ladies_event", labelKey: "event_types.ladies_event", icon: "✨" }),
  Object.freeze({ code: "baby_shower", labelKey: "event_types.baby_shower", icon: "🍼" }),
  Object.freeze({ code: "other", labelKey: "event_types.other", icon: "📅" }),
]);

const EVENT_CATEGORY_VALUES = Object.freeze(
  EVENT_CATEGORIES.map((category) => category.code)
);

const TEMPLATE_FAMILY_TO_EVENT_CATEGORY = Object.freeze({
  wedding: "wedding",
  engagement: "engagement",
  birthday: "birthday",
  conference: "conference",
  ladies_event: "ladies_event",
  baby_shower: "baby_shower",
  general_event: "other",
});

const GENERAL_EVENT_FALLBACK_CATEGORIES = Object.freeze([
  "graduation",
  "meeting",
]);

module.exports = {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_VALUES,
  TEMPLATE_FAMILY_TO_EVENT_CATEGORY,
  GENERAL_EVENT_FALLBACK_CATEGORIES,
};
