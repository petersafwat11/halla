const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CATEGORY_ASSIGNMENTS,
  EXPECTED_VARIABLE_MAPPING,
  buildLocalAssignment,
  validateManifest,
} = require("../scripts/lib/ownerTaqnyatTemplateBatch");
const {
  assertValidSampleImage,
  submitRecords,
} = require("../scripts/submit-owner-taqnyat-templates");
const {
  formatDay,
  getEventBodyParams,
  getRequiredEventImageUrl,
} = require("../src/modules/messaging/messaging.formatting");

const categories = Object.keys(CATEGORY_ASSIGNMENTS);
const modes = ["reply_and_qr", "reply_only"];

function bodyForMode(mode) {
  const base =
    "أهلًا {{1}}، يسرّ {{2}} دعوتك إلى {{3}} يوم {{4}} الموافق {{5}} " +
    "الساعة {{6}} في {{7}}.";
  if (mode === "reply_and_qr" || mode === "reply_only") {
    return `${base}\nيرجى الرد عبر أحد الخيارات أدناه.`;
  }
}

function makeManifest() {
  return {
    catalogVersion: "owner-v1",
    requestedMetaCategory: "UTILITY",
    language: "ar",
    allowCategoryChange: false,
    expectedTemplateCount: 14,
    imageHeader: { sampleHandle: "https://halaa.com.sa/logo.png" },
    footer: "هلا - إدارة الدعوات",
    variableMapping: EXPECTED_VARIABLE_MAPPING.map((entry) => ({ ...entry })),
    templates: categories.flatMap((category) =>
      modes.map((invitationMode) => {
        const suffix = {
          reply_and_qr: "reply_qr",
          reply_only: "reply_only",
        }[invitationMode];
        return {
          name: `halaa_${category}_${suffix}_ar_v2`,
          category,
          halaaCategory: CATEGORY_ASSIGNMENTS[category],
          invitationMode,
          body: bodyForMode(invitationMode),
          bodyExamples: [
            "سارة أحمد",
            "منال عبدالله",
            "ملتقى قادة الأعمال",
            "السبت",
            "15 أغسطس 2026",
            "8:30 مساءً",
            "قاعة ليلتي، جدة",
          ],
        };
      })
    ),
  };
}

test("valid owner manifest builds 14 UTILITY payloads with IMAGE headers", () => {
  const result = validateManifest(makeManifest());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.records.length, 14);

  for (const record of result.records) {
    assert.equal(record.payload.category, "UTILITY");
    assert.equal(record.payload.language, "ar");
    assert.equal(record.payload.allow_category_change, false);
    assert.deepEqual(record.payload.components[0], {
      type: "HEADER",
      format: "IMAGE",
      example: { header_handle: ["https://halaa.com.sa/logo.png"] },
    });
    assert.equal(record.varMapping.length, 7);
  }
});

test("mode controls match the Hala invitation-mode contract", () => {
  const result = validateManifest(makeManifest());
  assert.equal(result.valid, true, result.errors.join("\n"));

  const reply = result.records.find(
    (record) => record.invitationMode === "reply_and_qr"
  );
  const replyOnly = result.records.find(
    (record) => record.invitationMode === "reply_only"
  );

  const replyButtons = reply.payload.components.find(
    (component) => component.type === "BUTTONS"
  );
  assert.deepEqual(
    replyButtons.buttons.map((button) => button.text),
    ["سأحضر", "سأعتذر"]
  );
  assert.deepEqual(
    replyOnly.payload.components.find((component) => component.type === "BUTTONS"),
    {
      type: "BUTTONS",
      buttons: [
        { type: "QUICK_REPLY", text: "سأحضر" },
        { type: "QUICK_REPLY", text: "سأعتذر" },
      ],
    }
  );
});

test("local assignments preserve category, invite purpose, mode, and seven variables", () => {
  const result = validateManifest(makeManifest());
  assert.equal(result.valid, true, result.errors.join("\n"));

  result.records.forEach((record, index) => {
    assert.deepEqual(buildLocalAssignment(record, index), {
      category: record.halaaCategory,
      type: "invite",
      invitationMode: record.invitationMode,
      varMapping: record.varMapping,
      active: true,
      sortOrder: index,
    });
  });
});

test("manifest validation rejects missing image headers and formatting markers", () => {
  const manifest = makeManifest();
  manifest.imageHeader.sampleHandle = "";
  manifest.templates[0].body += "*";

  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("IMAGE-header")));
  assert.ok(result.errors.some((error) => error.includes("formatting marker")));
});

test("sample image validation accepts real signatures and rejects disguised files", () => {
  assert.doesNotThrow(() =>
    assertValidSampleImage(
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      "image/jpeg"
    )
  );
  assert.doesNotThrow(() =>
    assertValidSampleImage(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png"
    )
  );
  assert.throws(
    () => assertValidSampleImage(Buffer.from("not an image"), "image/png"),
    /does not match/
  );
});

test("descriptive owner categories map to valid current Hala event types", () => {
  const result = validateManifest(makeManifest());
  assert.equal(result.valid, true, result.errors.join("\n"));

  for (const category of ["ladies_event", "baby_shower", "general_event"]) {
    const records = result.records.filter((record) => record.category === category);
    assert.equal(records.length, 2);
    assert.ok(
      records.every(
        (record) => record.halaaCategory === CATEGORY_ASSIGNMENTS[category]
      )
    );
  }
});

test("seven-variable resolver includes the Arabic Riyadh weekday", () => {
  const event = {
    eventDetails: {
      title: "ملتقى قادة الأعمال",
      date: new Date("2026-08-15T00:00:00.000Z"),
      time: "20:30",
      location: { address: "قاعة ليلتي، جدة" },
    },
    host: { name: "منال عبدالله" },
  };
  const template = {
    varMapping: EXPECTED_VARIABLE_MAPPING.map((entry) => ({ ...entry })),
  };

  const params = getEventBodyParams(event, "سارة أحمد", template);
  assert.equal(params.length, 7);
  assert.equal(params[0], "سارة أحمد");
  assert.equal(params[1], "منال عبدالله");
  assert.equal(params[2], "ملتقى قادة الأعمال");
  assert.equal(params[3], formatDay(event.eventDetails.date));
  assert.ok(params[3]);
  assert.equal(params[5], "20:30");
  assert.equal(params[6], "قاعة ليلتي، جدة");
});

test("IMAGE-header templates require a public Step 3 image", () => {
  const template = { hasImageHeader: true };
  assert.equal(
    getRequiredEventImageUrl(
      {
        visualTemplate: {
          bakedImagePath: "https://cdn.example.com/events/e1/invitation.png",
        },
      },
      template
    ),
    "https://cdn.example.com/events/e1/invitation.png"
  );

  assert.throws(
    () => getRequiredEventImageUrl({ visualTemplate: {} }, template),
    (error) =>
      error.code === "TAQNYAT_TEMPLATE_IMAGE_REQUIRED" &&
      error.statusCode === 400
  );
  assert.equal(getRequiredEventImageUrl({}, { hasImageHeader: false }), null);
});

test("submission state prevents successful templates from being resubmitted", async () => {
  const manifest = makeManifest();
  const result = validateManifest(manifest);
  assert.equal(result.valid, true, result.errors.join("\n"));
  const records = result.records.slice(0, 2);
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "halaa-taqnyat-owner-batch-")
  );
  const statePath = path.join(temporaryDirectory, "state.json");
  const state = { templates: {} };
  let createCalls = 0;
  const taqnyat = {
    async createTemplate(name) {
      createCalls += 1;
      return { success: true, templateId: `id:${name}`, status: "PENDING" };
    },
  };

  const first = await submitRecords({
    records,
    state,
    statePath,
    taqnyat,
    retryOnly: false,
    upstream: [],
  });
  const second = await submitRecords({
    records,
    state,
    statePath,
    taqnyat,
    retryOnly: false,
    upstream: [],
  });

  assert.deepEqual(first, { submitted: 2, skipped: 0, failed: 0 });
  assert.deepEqual(second, { submitted: 0, skipped: 2, failed: 0 });
  assert.equal(createCalls, 2);
});
