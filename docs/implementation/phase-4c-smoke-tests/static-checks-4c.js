#!/usr/bin/env node
/**
 * Phase 4c static contract checks.
 *
 * Run from repo root:
 *   node docs/implementation/phase-4c-smoke-tests/static-checks-4c.js
 *
 * These are file-level structural checks — they DO NOT boot the
 * backend or render the UI. Manual verification of the live editor +
 * wizard is recorded in PHASE_4C_MANUAL_VERIFICATION.md.
 *
 * Coverage map per PLAN §3:
 *   W0-MODEL          TaqnyatTemplateModel + sync route + admin CRUD +
 *                     daily cron registration
 *   W0-VISUAL-BACKEND TemplateModel + TemplateCategoryModel + admin
 *                     CRUD + presigned-POST + sharp + orphan GC
 *   W0-RENAME         EventModel canonical sub-objects + dual-write +
 *                     migration script
 *   W0-DYNAMIC        _getEventBodyParams 5-param legacy fallback +
 *                     dynamic var-mapping resolver
 *   W1-VISUAL         admin templates pages + dynamic StepThree +
 *                     TemplateForm renderField + sidebar entries +
 *                     services/serverAuth.js mirror + useUnsavedChanges
 *   W1-TAQNYAT-ADMIN  /admin-dash/taqnyat-templates page + Sync +
 *                     AssignTaqnyatTemplateDialog
 *   W1-WIZARD-RENAME  6-step wizard + new StepFive + step locale
 *                     strings + useEventForm.buildEventPayload dual-
 *                     writes canonical keys
 *   W2-MOBILE-WIZARD  StepFour rebuilt as Taqnyat picker + StepFive
 *                     (NEW) + canvasBake util + dead-dep removal
 *   W2-MOBILE-RENAME  UpdateEventScreen / UpdateEventForm / useEventActionGate
 *                     read canonical first
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const checks = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// ─── W0-MODEL ────────────────────────────────────────────────────────────────
check("W0-MODEL: TaqnyatTemplateModel exists with varMapping schema", () => {
  const p = "labbe-backend-/models/TaqnyatTemplateModel.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/taqnyatId:\s*\{\s*type:\s*String,\s*required:\s*true/.test(src), "taqnyatId field missing");
  expect(/templateName:\s*\{\s*type:\s*String/.test(src), "templateName field missing");
  expect(/varMapping:\s*\{\s*type:\s*\[varMappingSchema\]/.test(src), "varMapping array field missing");
  expect(/category:\s*\{\s*type:\s*String/.test(src), "category field missing");
  expect(/lastSyncedAt:\s*\{\s*type:\s*Date/.test(src), "lastSyncedAt field missing");
});

check("W0-MODEL: taqnyat-templates module wired (service+controller+routes)", () => {
  const dir = "labbe-backend-/src/modules/taqnyat-templates";
  expect(exists(dir + "/index.js"), "index.js missing");
  expect(exists(dir + "/taqnyat-templates.service.js"), "service missing");
  expect(exists(dir + "/taqnyat-templates.controller.js"), "controller missing");
  expect(exists(dir + "/taqnyat-templates.routes.js"), "routes missing");
  const svc = read(dir + "/taqnyat-templates.service.js");
  expect(/syncFromTaqnyat/.test(svc), "syncFromTaqnyat export missing");
  expect(/listForHost/.test(svc), "listForHost export missing");
  expect(/assignMapping/.test(svc), "assignMapping export missing");
});

check("W0-MODEL: app.js mounts /taqnyat-templates + /admin/taqnyat-templates", () => {
  const src = read("labbe-backend-/src/app.js");
  expect(src.includes("/taqnyat-templates`"), "/taqnyat-templates mount missing");
  expect(src.includes("/admin/taqnyat-templates`"), "/admin/taqnyat-templates mount missing");
});

check("W0-MODEL: daily cron registered in initScheduledTasks", () => {
  const src = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  expect(/scheduleTaqnyatTemplateSync/.test(src), "scheduleTaqnyatTemplateSync registration missing");
  expect(exists("labbe-backend-/src/jobs/syncTaqnyatTemplates.js"), "jobs/syncTaqnyatTemplates.js missing");
});

// ─── W0-VISUAL-BACKEND ──────────────────────────────────────────────────────
check("W0-VISUAL-BACKEND: TemplateModel + TemplateCategoryModel exist", () => {
  expect(exists("labbe-backend-/models/TemplateModel.js"), "TemplateModel.js missing");
  expect(exists("labbe-backend-/models/TemplateCategoryModel.js"), "TemplateCategoryModel.js missing");
  const tplSrc = read("labbe-backend-/models/TemplateModel.js");
  // [PATCH 2] enum includes email + password
  expect(/enum:\s*\[[^\]]*"email"[^\]]*"password"[^\]]*\]/s.test(tplSrc), "field type enum missing email/password");
  expect(/imageS3Key:\s*\{\s*type:\s*String,\s*required:\s*true/.test(tplSrc), "imageS3Key required field missing");
});

check("W0-VISUAL-BACKEND: templates module routes mounted", () => {
  const app = read("labbe-backend-/src/app.js");
  expect(app.includes("/templates`"), "/templates mount missing");
  expect(app.includes("/admin/templates`"), "/admin/templates mount missing");
  expect(app.includes("/template-categories`"), "/template-categories mount missing");
  expect(app.includes("/admin/template-categories`"), "/admin/template-categories mount missing");
  expect(app.includes("/fonts`"), "/fonts mount missing");
});

check("W0-VISUAL-BACKEND: presigned-POST + orphan cleanup in service", () => {
  const src = read("labbe-backend-/src/modules/templates/templates.service.js");
  expect(/createPresignedPost/.test(src), "createPresignedPost reference missing");
  expect(/content-length-range.*5\s*\*\s*1024\s*\*\s*1024/s.test(src), "5MB cap missing");
  expect(/\^image\\\/\(jpeg\|png\|webp\)\$/.test(src), "content-type allowlist missing");
  expect(/deleteS3Key/.test(src) && /catch\s*\(err\)/.test(src), "orphan cleanup catch missing");
});

check("W0-VISUAL-BACKEND: gcOrphanTemplateImages script + --dry-run", () => {
  const p = "labbe-backend-/scripts/gcOrphanTemplateImages.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/--dry-run/.test(src), "--dry-run flag missing");
  expect(/ListObjectsV2Command/.test(src), "ListObjectsV2 missing");
  expect(/DeleteObjectCommand/.test(src), "DeleteObjectCommand missing");
});

check("W0-VISUAL-BACKEND: ADMIN_PAGES gains TEMPLATES + TEMPLATE_CATEGORIES + TAQNYAT_TEMPLATES", () => {
  const src = read("labbe-backend-/src/shared/constants/permissions.js");
  expect(/TEMPLATES:\s*['"]templates['"]/.test(src), "TEMPLATES enum missing");
  expect(/TEMPLATE_CATEGORIES:\s*['"]template_categories['"]/.test(src), "TEMPLATE_CATEGORIES enum missing");
  expect(/TAQNYAT_TEMPLATES:\s*['"]taqnyat_templates['"]/.test(src), "TAQNYAT_TEMPLATES enum missing");
});

check("W0-VISUAL-BACKEND: AuditLog targetType extended with template + template_category + taqnyat_template", () => {
  const src = read("labbe-backend-/models/AuditLogModel.js");
  expect(/"template"/.test(src), "template missing");
  expect(/"template_category"/.test(src), "template_category missing");
  expect(/"taqnyat_template"/.test(src), "taqnyat_template missing");
});

check("W0-VISUAL-BACKEND: templateDataValidator with email regex + color regex", () => {
  const p = "labbe-backend-/src/modules/events/templateDataValidator.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/EMAIL_REGEX/.test(src), "EMAIL_REGEX missing");
  expect(/HEX_COLOR_REGEX/.test(src), "HEX_COLOR_REGEX missing");
});

check("W0-VISUAL-BACKEND: fontRegistry exports FONTS + FONT_IDS", () => {
  const p = "labbe-backend-/src/shared/constants/fontRegistry.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/cairo/.test(src) && /amiri/.test(src) && /noto_sans_arabic/.test(src), "expected fonts missing");
});

// ─── W0-RENAME ───────────────────────────────────────────────────────────────
check("W0-RENAME: EventModel canonical sub-objects added", () => {
  const src = read("labbe-backend-/models/EventModel.js");
  expect(/canonicalVisualTemplateSchema/.test(src), "canonicalVisualTemplateSchema missing");
  expect(/canonicalTaqnyatTemplateSchema/.test(src), "canonicalTaqnyatTemplateSchema missing");
  expect(/guestRepliesSchema/.test(src), "guestRepliesSchema missing");
  expect(/visualTemplate:\s*canonicalVisualTemplateSchema/.test(src), "visualTemplate top-level field missing");
  expect(/taqnyatTemplate:\s*canonicalTaqnyatTemplateSchema/.test(src), "taqnyatTemplate top-level field missing");
  expect(/guestReplies:\s*guestRepliesSchema/.test(src), "guestReplies top-level field missing");
  expect(/invitationMessage:\s*String/.test(src), "invitationMessage top-level missing");
  expect(/hostNote:\s*String/.test(src), "hostNote top-level missing");
});

check("W0-RENAME: events.service updateInvitationSettings dual-writes", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/event\.visualTemplate\s*=\s*canonicalVisual/.test(src), "canonical visualTemplate write missing");
  expect(/event\.taqnyatTemplate\s*=\s*canonicalTaqnyat/.test(src), "canonical taqnyatTemplate write missing");
  expect(/event\.guestReplies\s*=\s*canonicalReplies/.test(src), "canonical guestReplies write missing");
});

check("W0-RENAME: createEvent projects legacy keys to canonical", () => {
  const src = read("labbe-backend-/src/modules/events/events.service.js");
  expect(/eventData\.visualTemplate\s*=\s*\{/.test(src), "createEvent canonical visualTemplate projection missing");
  expect(/eventData\.guestReplies\s*=\s*\{/.test(src), "createEvent canonical guestReplies projection missing");
});

check("W0-RENAME: migration script with --dry-run + --apply", () => {
  const p = "labbe-backend-/scripts/migrate-event-shape.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/--dry-run/.test(src), "--dry-run missing");
  expect(/--apply/.test(src), "--apply missing");
  expect(/projectLegacyToCanonical/.test(src), "projectLegacyToCanonical missing");
});

// ─── W0-DYNAMIC ──────────────────────────────────────────────────────────────
check("W0-DYNAMIC: _getEventBodyParams accepts taqnyatTemplate + has 5-param legacy fallback", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/_getEventBodyParams\(event,\s*guestName,\s*taqnyatTemplate/.test(src), "third arg taqnyatTemplate missing");
  // 5-param fallback shape
  expect(/guestName \|\| 'ضيفنا الكريم'/.test(src), "fallback param 1 missing");
  expect(/event\.eventDetails\?\.title \|\| 'مناسبة'/.test(src), "fallback param 2 missing");
  expect(/this\._formatDate\(event\.eventDetails\?\.date\)/.test(src), "fallback param 3 missing");
  expect(/event\.eventDetails\?\.time \|\| ''/.test(src), "fallback param 4 missing");
  expect(/event\.eventDetails\?\.location\?\.address \|\| 'يُحدد لاحقاً'/.test(src), "fallback param 5 missing");
});

check("W0-DYNAMIC: _resolveTaqnyatTemplate looks up canonical + legacy", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/_resolveTaqnyatTemplate/.test(src), "_resolveTaqnyatTemplate missing");
  expect(/event\.taqnyatTemplate\?\.templateRef/.test(src), "canonical templateRef lookup missing");
  expect(/event\.invitationSettings\?\.selectedTemplate\?\.name/.test(src), "legacy templateName fallback missing");
});

check("W0-DYNAMIC: handleButtonResponse reads canonical guestReplies first", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/event\.guestReplies\?\.onAttend \|\| event\.invitationSettings\?\.attendanceAutoReply/.test(src), "onAttend fallback chain missing");
  expect(/event\.guestReplies\?\.onAbsent \|\| event\.invitationSettings\?\.absenceAutoReply/.test(src), "onAbsent fallback chain missing");
});

check("W0-DYNAMIC: _getEventImageUrl prefers canonical bakedImagePath", () => {
  const src = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  expect(/event\.visualTemplate\?\.bakedImagePath\s*\|\|\s*event\.invitationSettings\?\.templateImage/.test(src), "bakedImagePath fallback chain missing");
});

// ─── W1-VISUAL ───────────────────────────────────────────────────────────────
check("W1-VISUAL: admin pages exist", () => {
  expect(exists("labbe/app/[lang]/admin-dash/templates/page.js"), "list page missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/[id]/page.js"), "editor page missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/categories/page.js"), "categories page missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/_components/TemplatesPageContent.jsx"), "list content missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/_components/TemplateEditorPage.jsx"), "editor missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/_components/FieldConfigPanel.jsx"), "FieldConfigPanel missing");
  expect(exists("labbe/app/[lang]/admin-dash/templates/_components/CategoryManager.jsx"), "CategoryManager missing");
});

check("W1-VISUAL: admin editor uses RHF mode:onSubmit + FormProvider + useUnsavedChanges", () => {
  const src = read("labbe/app/[lang]/admin-dash/templates/_components/TemplateEditorPage.jsx");
  expect(/mode:\s*"onSubmit"/.test(src), "mode:onSubmit missing per [PATCH 10]");
  expect(/FormProvider/.test(src), "FormProvider missing per [PATCH 9]");
  expect(/useUnsavedChanges/.test(src), "useUnsavedChanges missing per v4.2 Patch B");
});

check("W1-VISUAL: useUnsavedChanges hook is custom (no react-router-dom / react-use)", () => {
  const p = "labbe/hooks/useUnsavedChanges.js";
  expect(exists(p), "useUnsavedChanges missing");
  const src = read(p);
  // Reject only IMPORT lines — comments may mention these by name to
  // explain what we deliberately don't use.
  expect(!/(?:from|require\()\s*['"]react-router-dom['"]/.test(src), "react-router-dom import NOT allowed");
  expect(!/(?:from|require\()\s*['"]react-use['"]/.test(src), "react-use import NOT allowed");
  expect(/beforeunload/.test(src), "beforeunload listener missing");
  expect(/window\.history\.pushState/.test(src), "history.pushState patch missing");
});

check("W1-VISUAL: shared TemplatePreviewCanvas + OverlayItem", () => {
  expect(exists("labbe/components/shared/TemplatePreviewCanvas.jsx"), "TemplatePreviewCanvas missing");
  expect(exists("labbe/components/shared/OverlayItem.jsx"), "OverlayItem missing");
});

check("W1-VISUAL: services + queries + mutations", () => {
  expect(exists("labbe/services/templatesService.js"), "templatesService missing");
  expect(exists("labbe/services/taqnyatTemplatesService.js"), "taqnyatTemplatesService missing");
  expect(exists("labbe/hooks/queries/useTemplates.js"), "useTemplates missing");
  expect(exists("labbe/hooks/queries/useTaqnyatTemplates.js"), "useTaqnyatTemplates missing");
  expect(exists("labbe/hooks/mutations/useTemplateMutations.js"), "useTemplateMutations missing");
  const tplSrc = read("labbe/services/templatesService.js");
  expect(/adminUploadImage/.test(tplSrc), "adminUploadImage helper missing");
});

check("W1-VISUAL: serverAuth.js mirrors backend ADMIN_PAGES", () => {
  const src = read("labbe/services/serverAuth.js");
  expect(/TEMPLATES:\s*"templates"/.test(src), "TEMPLATES enum missing");
  expect(/TEMPLATE_CATEGORIES:\s*"template_categories"/.test(src), "TEMPLATE_CATEGORIES enum missing");
  expect(/TAQNYAT_TEMPLATES:\s*"taqnyat_templates"/.test(src), "TAQNYAT_TEMPLATES enum missing");
});

check("W1-VISUAL: navConfig sidebar gains the three entries", () => {
  const src = read("labbe/ui/layout/navConfig.js");
  expect(/key:\s*"templates"/.test(src), "templates nav entry missing");
  expect(/key:\s*"template_categories"/.test(src), "template_categories nav entry missing");
  expect(/key:\s*"taqnyat_templates"/.test(src), "taqnyat_templates nav entry missing");
});

check("W1-VISUAL: StepThree dropped hardcoded array, wired to useHostTemplates", () => {
  const src = read("labbe/app/[lang]/host/create-event/_components/stepThree/StepThree.js");
  expect(/useHostTemplates/.test(src), "useHostTemplates not used");
  expect(!/Classic Wedding/.test(src), "hardcoded 'Classic Wedding' still present");
  expect(!/Modern Elegant/.test(src), "hardcoded 'Modern Elegant' still present");
});

check("W1-VISUAL: TemplateForm dynamic path via renderField when fields[] present", () => {
  const tplSrc = read("labbe/app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx");
  expect(/template\?\.fields && template\.fields\.length > 0/.test(tplSrc), "fields branch missing");
  expect(/DynamicTemplateForm/.test(tplSrc), "DynamicTemplateForm path missing");
  expect(exists("labbe/app/[lang]/host/create-event/_components/templateForm/renderField.jsx"), "renderField helper missing");
});

check("W1-VISUAL: buildDynamicTemplateSchema + buildDefaultValues exported", () => {
  const src = read("labbe/utils/schemas/createEventSchema.js");
  expect(/export const buildDynamicTemplateSchema/.test(src), "buildDynamicTemplateSchema export missing");
  expect(/export const buildDefaultValues/.test(src), "buildDefaultValues export missing");
});

check("W1-VISUAL: deps added to labbe/package.json (no react-router-dom / react-use)", () => {
  const src = read("labbe/package.json");
  expect(/"react-rnd"/.test(src), "react-rnd dep missing");
  expect(/"@dnd-kit\/sortable"/.test(src), "@dnd-kit/sortable dep missing");
  expect(!/"react-router-dom"/.test(src), "react-router-dom must NOT be present");
  expect(!/"react-use"/.test(src), "react-use must NOT be present");
});

// ─── W1-TAQNYAT-ADMIN ────────────────────────────────────────────────────────
check("W1-TAQNYAT-ADMIN: page + table + assign dialog exist", () => {
  expect(exists("labbe/app/[lang]/admin-dash/taqnyat-templates/page.jsx"), "page missing");
  expect(exists("labbe/app/[lang]/admin-dash/taqnyat-templates/_components/TaqnyatTemplatesTable.jsx"), "table missing");
  expect(exists("labbe/app/[lang]/admin-dash/taqnyat-templates/_components/AssignTaqnyatTemplateDialog.jsx"), "dialog missing");
  const tableSrc = read("labbe/app/[lang]/admin-dash/taqnyat-templates/_components/TaqnyatTemplatesTable.jsx");
  expect(/useSyncTaqnyat/.test(tableSrc), "Sync button hook not wired");
});

check("W1-TAQNYAT-ADMIN: AssignDialog detects {{N}} placeholders + source-key dropdown", () => {
  const src = read("labbe/app/[lang]/admin-dash/taqnyat-templates/_components/AssignTaqnyatTemplateDialog.jsx");
  expect(/detectPlaceholders/.test(src), "detectPlaceholders helper missing");
  expect(/SOURCE_KEY_OPTIONS/.test(src), "SOURCE_KEY_OPTIONS missing");
  expect(/guest\.name/.test(src), "guest.name source key missing");
  expect(/eventDetails\.dateFormatted/.test(src), "eventDetails.dateFormatted source key missing");
});

// ─── W1-WIZARD-RENAME ───────────────────────────────────────────────────────
check("W1-WIZARD-RENAME: 6-step wizard wiring", () => {
  const pageSrc = read("labbe/app/[lang]/host/create-event/page.js");
  expect(/totalSteps:\s*6/.test(pageSrc), "useEventForm totalSteps:6 missing");
  expect(/totalSteps=\{6\}/.test(pageSrc), "Buttons totalSteps=6 missing");
  expect(/case 6/.test(pageSrc), "case 6 step missing");
  expect(/StepFive/.test(pageSrc), "StepFive import missing");
  expect(exists("labbe/app/[lang]/host/create-event/_components/stepFive/StepFive.js"), "StepFive component missing");
});

check("W1-WIZARD-RENAME: StepFour rebuilt as Taqnyat picker (no auto-replies)", () => {
  const src = read("labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js");
  expect(/useHostTaqnyatTemplates/.test(src), "useHostTaqnyatTemplates missing");
  expect(/taqnyatTemplate/.test(src), "taqnyatTemplate setValue missing");
  // Auto-replies UI moved out — there should be NO REPLY_TABS in StepFour now.
  expect(!/AUTO_REPLIES/.test(src), "AUTO_REPLIES still in StepFour — should be in StepFive");
});

check("W1-WIZARD-RENAME: useEventForm dual-writes canonical keys in buildEventPayload", () => {
  const src = read("labbe/hooks/events/useEventForm.js");
  expect(/taqnyatTemplateRef:/.test(src), "taqnyatTemplateRef payload key missing");
  expect(/guestReplies:/.test(src), "guestReplies payload key missing");
  expect(/invitationMessage:/.test(src), "invitationMessage payload key missing");
  expect(/hostNote:/.test(src), "hostNote payload key missing");
});

check("W1-WIZARD-RENAME: locales updated for 6-step structure", () => {
  const ar = read("labbe/localization/locales/ar/createEvent.json");
  const en = read("labbe/localization/locales/en/createEvent.json");
  expect(/step6_title/.test(ar), "step6_title missing in ar");
  expect(/step6_title/.test(en), "step6_title missing in en");
  expect(!/step3_title.*Staff/.test(en), "old 'Staff' step3 title still present");
});

check("W1-WIZARD-RENAME: Stepper has 6 entries", () => {
  const src = read("labbe/app/[lang]/host/create-event/_components/stepper/Stepper.js");
  // count `id:` entries in the steps array
  const ids = (src.match(/id:\s*\d+/g) || []).length;
  expect(ids === 6, `expected 6 step entries, got ${ids}`);
});

// ─── W2-MOBILE-WIZARD ───────────────────────────────────────────────────────
check("W2-MOBILE-WIZARD: dead deps removed", () => {
  const src = read("halla-mobile/package.json");
  expect(!/"html-to-image"/.test(src), "html-to-image must NOT be present");
  expect(!/"html2canvas"/.test(src), "html2canvas must NOT be present");
  expect(/"react-native-view-shot"/.test(src), "react-native-view-shot must remain");
});

check("W2-MOBILE-WIZARD: canvasBake util exists", () => {
  const p = "halla-mobile/utils/canvasBake.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/captureRef/.test(src), "captureRef missing");
  expect(/bakeCanvas/.test(src), "bakeCanvas export missing");
});

check("W2-MOBILE-WIZARD: StepFour rebuilt as Taqnyat picker", () => {
  const src = read("halla-mobile/components/createEvent/StepFour.js");
  expect(/taqnyatTemplatesService/.test(src), "taqnyatTemplatesService import missing");
  expect(/taqnyatTemplate/.test(src), "taqnyatTemplate setValue missing");
  expect(!/AUTO_REPLIES\s*=/.test(src), "AUTO_REPLIES still in mobile StepFour — should be in StepFive");
});

check("W2-MOBILE-WIZARD: StepFive (NEW) carries messaging+replies+note", () => {
  const p = "halla-mobile/components/createEvent/StepFive.js";
  expect(exists(p), `${p} missing`);
  const src = read(p);
  expect(/REPLY_TABS/.test(src), "REPLY_TABS missing");
  expect(/onAttend/.test(src) && /onAbsent/.test(src) && /onExpected/.test(src), "canonical reply keys missing");
});

check("W2-MOBILE-WIZARD: CreateEventScreen wired to 6 steps", () => {
  const src = read("halla-mobile/screens/CreateEventScreen.js");
  expect(/case 6/.test(src), "case 6 step missing in renderStepContent");
  expect(/totalSteps=\{6\}/.test(src), "StepHeader totalSteps={6} missing");
  expect(/currentStep === 6/.test(src), "next-button guard not updated");
  expect(/StepFive/.test(src), "StepFive import missing");
});

check("W2-MOBILE-WIZARD: EventsService dual-writes canonical keys + getDefaults seeds them", () => {
  const src = read("halla-mobile/services/EventsService.js");
  expect(/taqnyatTemplateRef:/.test(src), "taqnyatTemplateRef payload missing");
  expect(/visualTemplateRef:/.test(src), "visualTemplateRef payload missing");
  expect(/guestReplies:/.test(src), "guestReplies payload missing");
  expect(/invitationMessage:/.test(src), "invitationMessage payload missing");
  expect(/hostNote:/.test(src), "hostNote payload missing");
});

check("W2-MOBILE-WIZARD: api.config registers TAQNYAT_TEMPLATES.LIST", () => {
  const src = read("halla-mobile/config/api.js");
  expect(/TAQNYAT_TEMPLATES:\s*\{/.test(src), "TAQNYAT_TEMPLATES section missing");
  expect(/template-categories/.test(src), "categories endpoint not migrated to /template-categories");
});

// ─── W2-MOBILE-RENAME ───────────────────────────────────────────────────────
check("W2-MOBILE-RENAME: UpdateEventScreen reads canonical first", () => {
  const src = read("halla-mobile/screens/host/UpdateEventScreen.js");
  expect(/canonicalVisual/.test(src), "canonical visual var missing");
  expect(/canonicalTaqnyat/.test(src), "canonical taqnyat var missing");
  expect(/canonicalReplies\.onAttend/.test(src), "canonical reply read missing");
});

check("W2-MOBILE-RENAME: UpdateEventForm reads canonical first", () => {
  const src = read("halla-mobile/components/admin-dashboard/events/UpdateEventForm.js");
  expect(/canonicalReplies/.test(src), "canonical reply var missing");
  expect(/eventData\.taqnyatTemplate/.test(src), "taqnyatTemplate read missing");
});

check("W2-MOBILE-RENAME: useEventActionGate hasTemplate accepts canonical templateRef", () => {
  const src = read("halla-mobile/hooks/useEventActionGate.js");
  expect(/event\.taqnyatTemplate\?\.templateRef/.test(src), "canonical templateRef branch missing");
  expect(/event\.invitationSettings\?\.selectedTemplate\?\.name/.test(src), "legacy fallback missing");
});

// ─── Run / report ────────────────────────────────────────────────────────────
const ok = checks.filter((c) => c.ok).length;
const total = checks.length;
console.log(`\nPhase 4c static checks: ${ok}/${total}\n`);
for (const c of checks) {
  if (c.ok) {
    console.log(`  ✓ ${c.name}`);
  } else {
    console.log(`  ✗ ${c.name}`);
    console.log(`      ${c.error}`);
  }
}
process.exit(ok === total ? 0 : 1);
