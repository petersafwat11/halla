import { test } from "node:test";
import assert from "node:assert/strict";

import {
  eventStepForServerField,
  findEventStepForServerError,
  findFirstInvalidEventStep,
  validateEventStep,
} from "../../hooks/events/eventFormValidation.js";

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
  guestList: [{ name: "Mohammed", mobile: "0501234567" }],
  visualTemplate: { templateRef: "66aa11111111111111111111" },
  templateImage: new Blob(["baked-image"], { type: "image/jpeg" }),
  selectedTemplate: { _id: "66bb22222222222222222222", name: "Default Wedding Template" },
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

test("validateEventStep: step 2 requires complete guest and staff records with Saudi mobiles", () => {
  assert.equal(validateEventStep(2, completeFormData), true);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [] }), false);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [{ name: "", mobile: "0501234567" }] }), false);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [{ name: "Guest", mobile: "123" }] }), false);
  assert.equal(validateEventStep(2, { ...completeFormData, staffList: [{ name: "Staff", phone: "+966501234567" }] }), true);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [{ name: "Guest", mobile: "٠٥٠١٢٣٤٥٦٧" }] }), true);
});

test("validateEventStep: step 2 rejects numbers the backend event schema rejects (Egyptian, 00-prefixed)", () => {
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [{ name: "Guest", mobile: "+201001234567" }] }), false);
  assert.equal(validateEventStep(2, { ...completeFormData, staffList: [{ name: "Staff", phone: "01001234567" }] }), false);
  assert.equal(validateEventStep(2, { ...completeFormData, guestList: [{ name: "Guest", mobile: "00966501234567" }] }), false);
});

test("validateEventStep: step 3 requires a template mode and a baked or uploaded image", () => {
  assert.equal(validateEventStep(3, completeFormData), true);
  assert.equal(
    validateEventStep(3, {
      ...completeFormData,
      visualTemplate: { isCustomUpload: true },
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
  assert.equal(
    validateEventStep(3, {
      ...completeFormData,
      visualTemplate: { templateRef: "66aa11111111111111111111" },
      templateImage: null,
    }),
    false
  );
  // Update wizard: GET /events/:id populates visualTemplate.templateRef.
  assert.equal(
    validateEventStep(3, {
      ...completeFormData,
      visualTemplate: { templateRef: { _id: "66aa11111111111111111111", nameEn: "Royal" } },
    }),
    true
  );
});

test("validateEventStep: step 4 requires a valid Taqnyat template reference", () => {
  assert.equal(validateEventStep(4, completeFormData), true);
  assert.equal(
    validateEventStep(4, {
      ...completeFormData,
      selectedTemplate: null,
      taqnyatTemplate: { templateRef: "66cc33333333333333333333" },
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

test("validateEventStep: step 4 accepts the populated templateRef returned for existing events", () => {
  const populated = { _id: "66cc33333333333333333333", templateName: "wedding_invite", bodyText: "..." };
  assert.equal(
    validateEventStep(4, {
      ...completeFormData,
      selectedTemplate: { _id: populated._id, id: populated._id, name: populated.templateName },
      taqnyatTemplate: { templateRef: populated },
    }),
    true
  );
  assert.equal(
    validateEventStep(4, { ...completeFormData, selectedTemplate: null, taqnyatTemplate: { templateRef: { name: "no id" } } }),
    false
  );
});

test("create-flow validation locates the first invalid step and maps server fields", () => {
  assert.equal(findFirstInvalidEventStep(completeFormData), null);
  assert.equal(findFirstInvalidEventStep({ ...completeFormData, guestList: [] }), 2);
  assert.equal(eventStepForServerField("guestList.0.phone"), 2);
  assert.equal(eventStepForServerField("visualTemplate.templateRef"), 3);
  assert.equal(eventStepForServerField("taqnyatTemplate.templateRef"), 4);
  assert.equal(eventStepForServerField("launchSettings.scheduledDate"), 5);
  assert.equal(eventStepForServerField("eventDetailsExtra"), null);
});

test("findEventStepForServerError reads axios responses and code-only rejections", () => {
  const axiosError = {
    response: {
      data: {
        code: "VALIDATION_ERROR",
        errors: [
          { field: "visualTemplate.templateRef", message: "bad" },
          { field: "staffList.1.phone", message: "bad" },
        ],
      },
    },
  };
  assert.equal(findEventStepForServerError(axiosError), 2);
  assert.equal(findEventStepForServerError({ response: { data: { code: "BUSINESS_LOGO_REQUIRED" } } }), 1);
  assert.equal(findEventStepForServerError({ response: { data: { code: "EVENT_IMAGE_TOO_LARGE" } } }), 3);
  assert.equal(findEventStepForServerError({ response: { data: { code: "INTERNAL_ERROR" } } }), null);
  assert.equal(findEventStepForServerError(new Error("Network Error")), null);
});

test("validateEventStep: step 5 requires confirmReviewed (EVT-07)", () => {
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: true }), true);
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: false }), false);
  assert.equal(validateEventStep(5, { ...completeFormData, confirmReviewed: undefined }), false);
});
