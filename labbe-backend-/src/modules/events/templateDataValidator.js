/**
 * Template Data Validator — Phase 4c W0-VISUAL-BACKEND
 *
 * Per v4.1 §A-12 [PATCH 2] — runs before the visual-template snapshot is
 * persisted on the event. Rejects unknown keys, enforces required +
 * minLength/maxLength + min/max + email format + hex color regex.
 *
 * Throws an `AppError` (statusCode 400) with `validationErrors[]`
 * populated; caller surfaces this to the wizard so the host fixes their
 * input before the save succeeds.
 */

const AppError = require("../../shared/errors/AppError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function validateTemplateData(tpl, hostData) {
  if (!tpl || !Array.isArray(tpl.fields)) return; // no field-set — nothing to validate
  if (!hostData || typeof hostData !== "object") {
    throw new AppError("Template data must be an object", 400, "TEMPLATE_DATA_INVALID");
  }

  const errors = [];
  const validKeys = new Set(tpl.fields.map((f) => f.key));

  // Reject unknown keys
  for (const key of Object.keys(hostData)) {
    if (!validKeys.has(key)) {
      errors.push(`Unknown field key: "${key}"`);
    }
  }

  for (const field of tpl.fields) {
    const value = hostData[field.key];
    const isEmpty = value === undefined || value === null || value === "";

    if (field.required && isEmpty) {
      errors.push(`Field "${field.key}" is required`);
      continue;
    }
    if (isEmpty) continue;

    const strVal = String(value);

    if (["text", "textarea", "email", "password"].includes(field.type)) {
      if (field.minLength && strVal.length < field.minLength) {
        errors.push(`Field "${field.key}" must be at least ${field.minLength} characters`);
      }
      if (field.maxLength && strVal.length > field.maxLength) {
        errors.push(`Field "${field.key}" must be at most ${field.maxLength} characters`);
      }
    }

    if (field.type === "email" && !EMAIL_REGEX.test(strVal)) {
      errors.push(`Field "${field.key}" must be a valid email address`);
    }

    if (field.type === "number") {
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push(`Field "${field.key}" must be a number`);
      } else {
        if (field.min !== undefined && field.min !== null && num < field.min) {
          errors.push(`Field "${field.key}" must be ≥ ${field.min}`);
        }
        if (field.max !== undefined && field.max !== null && num > field.max) {
          errors.push(`Field "${field.key}" must be ≤ ${field.max}`);
        }
      }
    }

    if (field.type === "color" && !HEX_COLOR_REGEX.test(strVal)) {
      errors.push(`Field "${field.key}" must be a valid hex color`);
    }
  }

  if (errors.length > 0) {
    const err = new AppError("Template data validation failed", 400, "TEMPLATE_DATA_INVALID");
    err.validationErrors = errors;
    throw err;
  }
}

module.exports = { validateTemplateData };
