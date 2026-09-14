/**
 * Event create/update wizard rules shared by web and mobile, so both clients
 * block the same invalid data the backend event schema rejects and route a
 * rejected submit back to the same wizard step.
 * @module @halaa/shared/utils/eventWizard
 */

import { isValidSaudiMobile } from "./phone.js";
import { resolveReferenceId } from "./referenceId.js";

/** Step-3 visual template id from a string ref or a populated template. */
export const resolveVisualTemplateRef = (visualTemplate) =>
  resolveReferenceId(visualTemplate?.templateRef) ||
  resolveReferenceId(visualTemplate?._id ?? visualTemplate?.id);

/** Step-4 WhatsApp (Taqnyat) template id across every form-data shape. */
export const resolveTaqnyatTemplateRef = (formData) =>
  resolveReferenceId(formData?.taqnyatTemplate?.templateRef) ||
  resolveReferenceId(formData?.taqnyatTemplateRef) ||
  resolveReferenceId(formData?.selectedTemplate);

const firstFilled = (...values) =>
  values.find((value) => typeof value === "string" && value.trim() !== "");

/** Phone of a guest/staff row — web guests use `mobile`, everything else `phone`. */
export const eventPersonPhone = (person) =>
  firstFilled(person?.mobile, person?.phone) ?? "";

/** A guest/staff row the backend `guestEntry`/`staffEntry` schema accepts. */
export const isValidEventPerson = (person) => {
  const name = typeof person?.name === "string" ? person.name.trim() : "";
  return Boolean(name) && isValidSaudiMobile(eventPersonPhone(person));
};

/**
 * Rows that would be rejected at submit, with their list index, so the UI can
 * point the host at the exact guest/staff entry to fix.
 *
 * @returns {{ guests: Array<{index:number, person:object}>, staff: Array<{index:number, person:object}> }}
 */
export const findInvalidEventPeople = ({ guestList = [], staffList = [] } = {}) => {
  const collect = (list) =>
    (Array.isArray(list) ? list : [])
      .map((person, index) => ({ index, person }))
      .filter(({ person }) => !isValidEventPerson(person));
  return { guests: collect(guestList), staff: collect(staffList) };
};

// Wizard step (1-5) that owns each backend field path (validateZod joins the
// Zod issue path with ".", e.g. `guestList.3.phone`).
const FIELD_STEP_RULES = [
  [/^(eventDetails|eventName|eventType|eventDate|eventTime|address)(\.|$)/, 1],
  [/^(guestList|staffList|supervisorsList)(\.|$)/, 2],
  [/^(visualTemplate|templateImage)(\.|$)/, 3],
  [/^(taqnyatTemplate|taqnyatTemplateRef|selectedTemplate|invitationType|guestReplies)(\.|$)/, 4],
  [/^(launchSettings|scheduleDate|scheduleTime)(\.|$)/, 5],
];

// Rejections that carry an error code but no field path.
const CODE_STEPS = {
  BUSINESS_LOGO_REQUIRED: 1,
  EVENT_IMAGE_REQUIRED: 3,
  EVENT_IMAGE_TOO_LARGE: 3,
  EVENT_IMAGE_UNPROCESSABLE: 3,
  LIMIT_FILE_SIZE: 3,
  LIMIT_UNEXPECTED_FILE: 3,
};

export const eventStepForServerField = (field) => {
  if (typeof field !== "string" || !field) return null;
  const rule = FIELD_STEP_RULES.find(([pattern]) => pattern.test(field));
  return rule ? rule[1] : null;
};

export const eventStepForServerCode = (code) =>
  (typeof code === "string" && CODE_STEPS[code]) || null;

/**
 * Earliest wizard step implicated by a rejected submit. Accepts the axios
 * error (`response.data`), a parsed error (`errors`, `code`) or the mobile
 * fetch error (`errors`, `code`, `data`).
 *
 * @returns {number|null}
 */
export const findEventStepForServerError = (error) => {
  const body = error?.response?.data || error?.data || {};
  const errors = Array.isArray(error?.errors)
    ? error.errors
    : Array.isArray(body.errors)
      ? body.errors
      : [];
  const steps = errors
    .map((item) => eventStepForServerField(item?.field))
    .filter(Boolean);
  const codeStep = eventStepForServerCode(error?.code || body.code);
  if (codeStep) steps.push(codeStep);
  return steps.length ? Math.min(...steps) : null;
};
