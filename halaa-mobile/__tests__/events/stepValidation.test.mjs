import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateStepData,
  getDefaultFormValues,
} from "../../hooks/events/useEventForm.js";

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
  templateImage: { uri: "file://baked-template.jpg" },
  selectedTemplate: { name: "Default Wedding Template" },
  confirmReviewed: true,
};

test("validateStepData: step 1 requires eventType, eventName, eventDate, eventTime, and address", () => {
  assert.equal(validateStepData(1, completeFormData), true);

  // Missing address
  const missingAddr = { ...completeFormData, address: { address: "" } };
  assert.equal(validateStepData(1, missingAddr), false);

  // Blank event name
  const blankName = { ...completeFormData, eventName: "   " };
  assert.equal(validateStepData(1, blankName), false);

  // Blank event time
  const blankTime = { ...completeFormData, eventTime: "" };
  assert.equal(validateStepData(1, blankTime), false);
});

test("validateStepData: step 2 requires non-empty guestList", () => {
  assert.equal(validateStepData(2, completeFormData), true);
  assert.equal(validateStepData(2, { ...completeFormData, guestList: [] }), false);
});

test("validateStepData: step 3 requires template mode/reference and a baked or uploaded image", () => {
  assert.equal(validateStepData(3, completeFormData), true);
  assert.equal(
    validateStepData(3, {
      ...completeFormData,
      visualTemplate: { isCustomUpload: true },
      templateImage: { uri: "file://image.png" },
    }),
    true
  );
  assert.equal(
    validateStepData(3, {
      ...completeFormData,
      visualTemplate: null,
      templateImage: null,
    }),
    false
  );
});

test("validateStepData: step 4 requires selectedTemplate or taqnyatTemplate", () => {
  assert.equal(validateStepData(4, completeFormData), true);
  assert.equal(
    validateStepData(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: { templateRef: "taqnyat_1" },
    }),
    true
  );
  assert.equal(
    validateStepData(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: null,
    }),
    false
  );
});

test("validateStepData (EVT-07): step 5 enforces mandatory confirmReviewed checkbox", () => {
  // When confirmReviewed is true => valid
  assert.equal(validateStepData(5, { ...completeFormData, confirmReviewed: true }), true);

  // When confirmReviewed is false / unchecked => invalid (EVT-07 fix)
  assert.equal(validateStepData(5, { ...completeFormData, confirmReviewed: false }), false);
  assert.equal(validateStepData(5, { ...completeFormData, confirmReviewed: undefined }), false);
});

test("validateStepData (EVT-07): step 6 performs complete validation including confirmReviewed", () => {
  assert.equal(validateStepData(6, completeFormData), true);

  // Fails if confirmReviewed is false
  assert.equal(validateStepData(6, { ...completeFormData, confirmReviewed: false }), false);

  // Fails if any step is incomplete
  assert.equal(validateStepData(6, { ...completeFormData, eventName: "" }), false);
  assert.equal(validateStepData(6, { ...completeFormData, guestList: [] }), false);
});
