import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateStepData,
  validateListItem,
  getDefaultFormValues,
  findFirstInvalidEventStep,
  eventStepForServerField,
  findEventStepForServerError,
  transformFormDataToPayload,
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
  visualTemplate: { templateRef: "507f1f77bcf86cd799439011" },
  templateImage: { uri: "file://baked-template.jpg" },
  selectedTemplate: { _id: "507f1f77bcf86cd799439012", name: "Default Wedding Template" },
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

test("validateStepData: step 2 requires complete guest and staff records with Saudi mobiles", () => {
  assert.equal(validateStepData(2, completeFormData), true);
  assert.equal(validateStepData(2, { ...completeFormData, guestList: [] }), false);
  assert.equal(validateStepData(2, { ...completeFormData, guestList: [{ name: "", phone: "501234567" }] }), false);
  assert.equal(validateStepData(2, { ...completeFormData, staffList: [{ name: "Staff", phone: "123" }] }), false);
  assert.equal(validateStepData(2, { ...completeFormData, staffList: [{ name: "Staff", phone: "+966 50 123 4567" }] }), true);
});

test("Egyptian numbers are rejected at add time and at step validation (backend is Saudi-only)", () => {
  assert.equal(validateStepData(2, { ...completeFormData, guestList: [{ name: "Guest", phone: "+201001234567" }] }), false);
  const added = validateListItem({ name: "Guest", phone: "+201001234567" }, "guest", []);
  assert.equal(added.isValid, false);
  assert.equal(added.errors.phone, "events:validation.phoneInvalid");
  assert.equal(validateListItem({ name: "Guest", phone: "0501234567" }, "guest", []).isValid, true);
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

test("validateStepData: step 4 requires a valid Taqnyat template reference", () => {
  assert.equal(validateStepData(4, completeFormData), true);
  assert.equal(
    validateStepData(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: { templateRef: "507f1f77bcf86cd799439013" },
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
  assert.equal(
    validateStepData(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: { templateRef: { _id: "507f1f77bcf86cd799439013", templateName: "invite" } },
    }),
    true
  );
});

test("create-flow validation locates the first invalid step and maps server errors", () => {
  assert.equal(findFirstInvalidEventStep({ ...completeFormData, guestList: [] }), 2);
  assert.equal(findFirstInvalidEventStep(completeFormData), null);
  assert.equal(eventStepForServerField("guestList.0.phone"), 2);
  assert.equal(eventStepForServerField("taqnyatTemplate.templateRef"), 4);
  // Mobile fetch errors carry `errors`/`code` directly on the Error.
  const fetchError = Object.assign(new Error("Validation failed"), {
    code: "VALIDATION_ERROR",
    errors: [{ field: "taqnyatTemplate.templateRef" }, { field: "eventDetails.location.address" }],
  });
  assert.equal(findEventStepForServerError(fetchError), 1);
  assert.equal(findEventStepForServerError(Object.assign(new Error("x"), { code: "EVENT_IMAGE_UNPROCESSABLE" })), 3);
  assert.equal(findEventStepForServerError(new Error("offline")), null);
});

test("event payload normalizes coordinates without turning blank values into zero", () => {
  const numeric = transformFormDataToPayload({
    ...completeFormData,
    address: { ...completeFormData.address, latitude: "24.7136", longitude: "46.6753" },
  });
  assert.equal(numeric.eventDetails.location.latitude, 24.7136);
  assert.equal(numeric.eventDetails.location.longitude, 46.6753);

  for (const [latitude, longitude] of [[null, ""], [" ", "46.6753"], ["24.7", "abc"], ["95", "46.6"]]) {
    const payload = transformFormDataToPayload({
      ...completeFormData,
      address: { address: "Riyadh", latitude, longitude },
    });
    assert.equal(payload.eventDetails.location.latitude, null, `latitude for ${latitude},${longitude}`);
    assert.equal(payload.eventDetails.location.longitude, null, `longitude for ${latitude},${longitude}`);
  }

  const equator = transformFormDataToPayload({
    ...completeFormData,
    address: { address: "Null Island", latitude: 0, longitude: 0 },
  });
  assert.equal(equator.eventDetails.location.latitude, 0);
  assert.equal(equator.eventDetails.location.longitude, 0);
});

test("event payload sends the template id for a populated Taqnyat templateRef", () => {
  const payload = transformFormDataToPayload({
    ...completeFormData,
    selectedTemplate: null,
    taqnyatTemplate: { templateRef: { _id: "507f1f77bcf86cd799439013", templateName: "invite" } },
    visualTemplate: { templateRef: { _id: "507f1f77bcf86cd799439011" }, fieldValues: {} },
  });
  assert.deepEqual(payload.taqnyatTemplate, { templateRef: "507f1f77bcf86cd799439013" });
  assert.equal(payload.visualTemplate.templateRef, "507f1f77bcf86cd799439011");
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

test("getDefaultFormValues keeps an unpinned location", () => {
  const { address } = getDefaultFormValues();
  assert.equal(address.latitude, null);
  assert.equal(address.longitude, null);
});
