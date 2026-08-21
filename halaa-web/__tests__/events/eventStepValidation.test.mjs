import { test } from "node:test";
import assert from "node:assert/strict";

import { validateEventStep } from "../../hooks/events/eventFormValidation.js";

const completeFormData = {
  eventType: "wedding",
  eventName: "Ali & Sara Wedding",
  eventDate: "2026-10-15",
  eventTime: "07:30 PM",
  address: {
    address: "Riyadh Exhibition Center",
    latitude: 24.7136,
    longitude: 46.6753,
  },
  guestList: [{ name: "Mohammed", phone: "501234567" }],
  visualTemplate: { templateRef: "template_123" },
  selectedTemplate: { name: "Default Wedding Template" },
  confirmReviewed: true,
};

test("validateEventStep: step 1 requires eventType, eventName, eventDate, eventTime, and address (EVT-08)", () => {
  assert.equal(validateEventStep(1, completeFormData), true);

  // Missing or empty address fails (EVT-08 fix)
  const missingAddr = { ...completeFormData, address: { address: "" } };
  assert.equal(validateEventStep(1, missingAddr), false);

  const nullAddr = { ...completeFormData, address: null };
  assert.equal(validateEventStep(1, nullAddr), false);

  // Blank event name fails
  const blankName = { ...completeFormData, eventName: "   " };
  assert.equal(validateEventStep(1, blankName), false);

  // Blank event time fails
  const blankTime = { ...completeFormData, eventTime: "" };
  assert.equal(validateEventStep(1, blankTime), false);

  // Missing event date fails
  const missingDate = { ...completeFormData, eventDate: "" };
  assert.equal(validateEventStep(1, missingDate), false);
});

test("validateEventStep: step 2 requires non-empty guestList", () => {
  assert.equal(validateEventStep(2, completeFormData), true);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [] }), false);
});

test("validateEventStep: step 3 requires template image or visual template", () => {
  assert.equal(validateEventStep(3, completeFormData), true);
  assert.equal(
    validateEventStep(3, {
      ...completeFormData,
      visualTemplate: null,
      templateImage: "data:image/png;base64,...",
    }),
    true
  );
  assert.equal(
    validateEventStep(3, {
      ...completeFormData,
      visualTemplate: null,
      templateImage: null,
    }),
    false
  );
});

test("validateEventStep: step 4 requires selectedTemplate or taqnyatTemplate", () => {
  assert.equal(validateEventStep(4, completeFormData), true);
  assert.equal(
    validateEventStep(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: { templateRef: "taqnyat_1" },
    }),
    true
  );
  assert.equal(
    validateEventStep(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: null,
    }),
    false
  );
});

test("validateEventStep: step 5 requires confirmReviewed (EVT-07)", () => {
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: true }), true);
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: false }), false);
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: undefined }), false);
});
