"use strict";

const crypto = require("crypto");

const EXPECTED_TEMPLATE_COUNT = 14;
const REQUESTED_META_CATEGORY = "UTILITY";
const LANGUAGE = "ar";
const ALLOW_CATEGORY_CHANGE = false;

const {
  TEMPLATE_FAMILY_TO_EVENT_CATEGORY: CATEGORY_ASSIGNMENTS,
} = require("@halaa/shared/constants/eventCategories.cjs");

const MODE_DEFINITIONS = Object.freeze({
  reply_and_qr: { suffix: "reply_qr" },
  reply_only: { suffix: "reply_only" },
});

const EXPECTED_VARIABLE_MAPPING = Object.freeze([
  { placeholder: "{{1}}", sourceKey: "guest.name" },
  { placeholder: "{{2}}", sourceKey: "host.name" },
  { placeholder: "{{3}}", sourceKey: "eventDetails.title" },
  { placeholder: "{{4}}", sourceKey: "eventDetails.dayFormatted" },
  { placeholder: "{{5}}", sourceKey: "eventDetails.dateFormatted" },
  { placeholder: "{{6}}", sourceKey: "eventDetails.time" },
  { placeholder: "{{7}}", sourceKey: "eventDetails.location.address" },
]);

const EXPECTED_PLACEHOLDERS = EXPECTED_VARIABLE_MAPPING.map(
  (entry) => entry.placeholder
);

const REQUIRED_REPLY_BUTTONS = Object.freeze([
  { type: "QUICK_REPLY", text: "سأحضر" },
  { type: "QUICK_REPLY", text: "سأعتذر" },
]);

const RESPONSE_LANGUAGE =
  /(يرجى|يُرجى).{0,30}(الرد|تأكيد)|تأكيد.{0,20}الحضور|الخيارات.{0,20}(أدناه|التالية)/u;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePlaceholder(value) {
  const match = String(value || "").match(/^\{\{\s*(\d+)\s*\}\}$/);
  return match ? `{{${match[1]}}}` : String(value || "");
}

function bodyPlaceholders(body) {
  return (String(body || "").match(/\{\{\s*\d+\s*\}\}/g) || []).map(
    normalizePlaceholder
  );
}

function expectedTemplateName(category, invitationMode) {
  const mode = MODE_DEFINITIONS[invitationMode];
  if (!mode || !CATEGORY_ASSIGNMENTS[category]) return null;
  return `halaa_${category}_${mode.suffix}_ar_v2`;
}

function stableManifestHash(manifest) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");
}

function validateVariableMapping(mapping, errors) {
  if (!Array.isArray(mapping)) {
    errors.push("variableMapping must be an array.");
    return;
  }
  if (mapping.length !== EXPECTED_VARIABLE_MAPPING.length) {
    errors.push(
      `variableMapping must contain exactly ${EXPECTED_VARIABLE_MAPPING.length} entries.`
    );
    return;
  }

  EXPECTED_VARIABLE_MAPPING.forEach((expected, index) => {
    const actual = mapping[index] || {};
    if (normalizePlaceholder(actual.placeholder) !== expected.placeholder) {
      errors.push(
        `variableMapping[${index}].placeholder must be ${expected.placeholder}.`
      );
    }
    if (actual.sourceKey !== expected.sourceKey) {
      errors.push(
        `variableMapping[${index}].sourceKey must be ${expected.sourceKey}.`
      );
    }
  });
}

function validateHeaderHandle(headerHandle, errors) {
  if (!headerHandle || !String(headerHandle).trim()) {
    errors.push(
      "A public HTTPS IMAGE-header sample URL is required. Set " +
        "imageHeader.sampleHandle in the manifest or pass --sample-header-url."
    );
    return;
  }
  try {
    const url = new URL(String(headerHandle));
    if (url.protocol !== "https:") throw new Error("not HTTPS");
  } catch (_error) {
    errors.push("The IMAGE-header sample must be a valid public HTTPS URL.");
  }
}

function validateTemplateRecord(template, index, manifest, errors) {
  const prefix = `templates[${index}]`;
  if (!isPlainObject(template)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }

  const expectedHalaaCategory = CATEGORY_ASSIGNMENTS[template.category];
  if (!expectedHalaaCategory) {
    errors.push(
      `${prefix}.category must be one of: ${Object.keys(
        CATEGORY_ASSIGNMENTS
      ).join(", ")}.`
    );
  }
  if (template.halaaCategory !== expectedHalaaCategory) {
    errors.push(
      `${prefix}.halaaCategory must be ${expectedHalaaCategory || "<invalid>"} ` +
        `for source category ${template.category || "<missing>"}.`
    );
  }

  if (!MODE_DEFINITIONS[template.invitationMode]) {
    errors.push(
      `${prefix}.invitationMode must be reply_and_qr or reply_only.`
    );
  }

  const expectedName = expectedTemplateName(
    template.category,
    template.invitationMode
  );
  if (template.name !== expectedName) {
    errors.push(`${prefix}.name must be ${expectedName || "<invalid>"}.`);
  }
  if (!/^[a-z0-9_]+$/.test(String(template.name || ""))) {
    errors.push(
      `${prefix}.name may contain lowercase ASCII letters, digits, and underscores only.`
    );
  }

  const body = String(template.body || "");
  if (!body.trim()) {
    errors.push(`${prefix}.body is required.`);
  }
  if (body.length > 1024) {
    errors.push(`${prefix}.body exceeds Taqnyat's configured 1024-character limit.`);
  }
  if (body.includes("*")) {
    errors.push(`${prefix}.body contains a visible '*' formatting marker.`);
  }

  const placeholders = bodyPlaceholders(body);
  if (JSON.stringify(placeholders) !== JSON.stringify(EXPECTED_PLACEHOLDERS)) {
    errors.push(
      `${prefix}.body must contain ${EXPECTED_PLACEHOLDERS.join(
        ", "
      )} exactly once and in order; found ${placeholders.join(", ") || "none"}.`
    );
  }

  if (
    !Array.isArray(template.bodyExamples) ||
    template.bodyExamples.length !== EXPECTED_PLACEHOLDERS.length ||
    template.bodyExamples.some((value) => !String(value || "").trim())
  ) {
    errors.push(
      `${prefix}.bodyExamples must contain seven non-empty values in placeholder order.`
    );
  }

  const footer =
    template.footer === undefined ? manifest.footer : template.footer;
  if (!String(footer || "").trim()) {
    errors.push(`${prefix} requires a non-empty footer.`);
  }

  if (
    (template.invitationMode === "reply_and_qr" ||
      template.invitationMode === "reply_only") &&
    !RESPONSE_LANGUAGE.test(body)
  ) {
    errors.push(
      `${prefix}.body must tell the guest to reply or confirm attendance.`
    );
  }
}

function buildComponents(template, manifest, headerHandle) {
  const footer =
    template.footer === undefined ? manifest.footer : template.footer;
  const components = [
    {
      type: "HEADER",
      format: "IMAGE",
      example: { header_handle: [String(headerHandle)] },
    },
    {
      type: "BODY",
      text: template.body,
      example: { body_text: [template.bodyExamples.map(String)] },
    },
    {
      type: "FOOTER",
      text: footer,
    },
  ];

  if (
    template.invitationMode === "reply_and_qr" ||
    template.invitationMode === "reply_only"
  ) {
    components.push({
      type: "BUTTONS",
      buttons: REQUIRED_REPLY_BUTTONS.map((button) => ({ ...button })),
    });
  }

  return components;
}

function buildApiPayload(template, manifest, headerHandle) {
  return {
    name: template.name,
    category: REQUESTED_META_CATEGORY,
    language: LANGUAGE,
    allow_category_change: ALLOW_CATEGORY_CHANGE,
    components: buildComponents(template, manifest, headerHandle),
  };
}

function buildLocalAssignment(record, sortOrder = 0) {
  return {
    category: record.halaaCategory,
    type: "invite",
    invitationMode: record.invitationMode,
    varMapping: record.varMapping.map((entry) => ({ ...entry })),
    active: true,
    sortOrder,
  };
}

function validateManifest(manifest, options = {}) {
  const errors = [];
  if (!isPlainObject(manifest)) {
    return {
      valid: false,
      errors: ["Manifest root must be a JSON object."],
      records: [],
    };
  }

  if (manifest.requestedMetaCategory !== REQUESTED_META_CATEGORY) {
    errors.push(`requestedMetaCategory must be ${REQUESTED_META_CATEGORY}.`);
  }
  if (manifest.language !== LANGUAGE) {
    errors.push(`language must be ${LANGUAGE}.`);
  }
  if (manifest.allowCategoryChange !== ALLOW_CATEGORY_CHANGE) {
    errors.push("allowCategoryChange must be false.");
  }
  if (manifest.expectedTemplateCount !== EXPECTED_TEMPLATE_COUNT) {
    errors.push(
      `expectedTemplateCount must be ${EXPECTED_TEMPLATE_COUNT}.`
    );
  }

  validateVariableMapping(manifest.variableMapping, errors);

  const headerHandle =
    options.headerHandle || manifest.imageHeader?.sampleHandle || "";
  validateHeaderHandle(headerHandle, errors);

  if (!Array.isArray(manifest.templates)) {
    errors.push("templates must be an array.");
  } else if (manifest.templates.length !== EXPECTED_TEMPLATE_COUNT) {
    errors.push(
      `templates must contain exactly ${EXPECTED_TEMPLATE_COUNT} items; found ${manifest.templates.length}.`
    );
  }

  const seenNames = new Set();
  const seenCombinations = new Set();
  (manifest.templates || []).forEach((template, index) => {
    validateTemplateRecord(template, index, manifest, errors);

    if (template?.name) {
      if (seenNames.has(template.name)) {
        errors.push(`Duplicate template name: ${template.name}.`);
      }
      seenNames.add(template.name);
    }

    const combination = `${template?.category}:${template?.invitationMode}`;
    if (seenCombinations.has(combination)) {
      errors.push(`Duplicate category/mode combination: ${combination}.`);
    }
    seenCombinations.add(combination);
  });

  for (const category of Object.keys(CATEGORY_ASSIGNMENTS)) {
    for (const invitationMode of Object.keys(MODE_DEFINITIONS)) {
      const combination = `${category}:${invitationMode}`;
      if (!seenCombinations.has(combination)) {
        errors.push(`Missing category/mode combination: ${combination}.`);
      }
    }
  }

  const records =
    errors.length === 0
      ? manifest.templates.map((template) => ({
          name: template.name,
          category: template.category,
          halaaCategory: template.halaaCategory,
          invitationMode: template.invitationMode,
          varMapping: EXPECTED_VARIABLE_MAPPING.map((entry) => ({ ...entry })),
          payload: buildApiPayload(template, manifest, headerHandle),
        }))
      : [];

  return {
    valid: errors.length === 0,
    errors,
    records,
    headerHandle,
    manifestHash: stableManifestHash(manifest),
  };
}

module.exports = {
  EXPECTED_TEMPLATE_COUNT,
  REQUESTED_META_CATEGORY,
  LANGUAGE,
  ALLOW_CATEGORY_CHANGE,
  CATEGORY_ASSIGNMENTS,
  MODE_DEFINITIONS,
  EXPECTED_VARIABLE_MAPPING,
  REQUIRED_REPLY_BUTTONS,
  bodyPlaceholders,
  expectedTemplateName,
  stableManifestHash,
  buildApiPayload,
  buildLocalAssignment,
  validateManifest,
};
