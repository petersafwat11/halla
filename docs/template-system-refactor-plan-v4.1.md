# Template System Refactor Plan — v4.1

> **Status:** Planning only. No implementation files have been changed.
> **Supersedes:** `template-system-refactor-plan-v4.md` (v4)

---

## Changelog from v4 → v4.1

| # | Patch | Section(s) affected |
|---|-------|---------------------|
| 1 | Mobile renderField: remove all `rules={...}` props — zodResolver is single source of truth | E |
| 2 | Field type registry: add `email` and `password` types | A-4, C, A-12, B-18, D |
| 3 | S3 orphan cleanup: add Section A-7.1 + daily GC script spec | A-7.1 (new) |
| 4 | InputGroup `min`/`max`/`step` guard: spread only when `type === "number"` | A-4 |
| 5 | `dir="auto"` semantics: returns `undefined`, does not set inline style | A-4 |
| 6 | `autoCapitalize` on InputGroup: add prop, pass through to `<input>` | A-4 |
| 7 | TextArea RTL padding bug: `paddingRight` when `dir === "rtl"` for prefixText | A-4 |
| 8 | FONT_IDS source: one-line note in B-18 about `labbe/config/fonts.js` | B-18 |
| 9 | FormProvider placement: explicit notes in Section D and E | D, E |
| 10 | RHF mode: `useForm({ mode: "onSubmit" })` in admin editor | D |
| 11 | Unsaved-changes guard: `useBeforeUnload(formState.isDirty)` in Save Flow | D |
| 12 | Grep test in H-3 fixed | H-3 |
| 13 | Time-format adapter comments: edge-case notes on parseTimeString / dateToTimeString | B-18 |
| 14 | Action button reuse: use `labbe/ui/commen/button/Button.jsx` — no raw `<button>` | D |

---

## Section A — Architecture

### A-1. Admin Dashboard Page

**Route path (web):**
```
labbe/app/[lang]/admin-dash/templates/page.js          → list page
labbe/app/[lang]/admin-dash/templates/[id]/page.js     → editor page (create/edit)
labbe/app/[lang]/admin-dash/templates/categories/page.js → category manager
```

**RBAC — Reuse existing pattern exactly.**

Backend adds `ADMIN_PAGES.TEMPLATES = 'templates'` and `ADMIN_PAGES.TEMPLATE_CATEGORIES = 'template_categories'` to:
- `labbe-backend-/src/shared/constants/permissions.js` — add to `ADMIN_PAGES` object and `ROLE_PAGE_ACCESS` matrix
- `labbe/services/serverAuth.js` — frontend mirror must be kept in sync

Access levels in `ROLE_PAGE_ACCESS`:

| Role | `templates` | `template_categories` |
|---|---|---|
| `super_admin` | `FULL` | `FULL` |
| `admin` | `FULL` | `FULL` |
| `moderator` | `EDIT` | `VIEW` |
| `whitelabel_admin` | `NONE` | `NONE` |
| `whitelabel_moderator` | `NONE` | `NONE` |
| `host` | `NONE` | `NONE` |

Server-side guard in each page.js (same pattern as existing admin pages):
```js
// labbe/app/[lang]/admin-dash/templates/page.js
import { requirePageAccess } from "@/services/serverAuth";

export default async function TemplatesPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("templates", lang);
  return <TemplatesPageContent />;
}
```

Backend route guard (same pattern as existing admin routes):
```js
router.post('/admin/templates',
  requirePageAccess(ADMIN_PAGES.TEMPLATES, 'create'),
  adminTemplatesController.createTemplate
);
```

The mobile `AdminNavigator.js` adds a Templates tab gated by `canViewPage(userRole, PAGES.TEMPLATES)` — same pattern as existing tabs.

**List page features**: search by name, filter by category (dropdown), toggle to show/hide inactive templates. Each row shows thumbnail, name (ar/en), categories, status badge, and action buttons (edit / duplicate / deactivate). All UI strings are locale-keyed (see Section H-2a).

**Audit fields on every template**: `createdBy`, `updatedBy` (ObjectId refs to User), `createdAt`, `updatedAt` (from Mongoose timestamps), `version` (integer).

---

### A-2. Template Editor

**Layout**: two-pane, side by side.

- **Left pane** (`TemplateEditorCanvas.jsx`): image background + draggable overlay elements. Width ~600px in the editor. Height derived from `naturalWidth / naturalHeight` aspect ratio using CSS `aspect-ratio`.
- **Right pane** (`FieldConfigPanel.jsx`): scrollable configuration panel — field list, per-field settings, global settings (name, categories, active toggle, sort order).

**Drag-and-drop library**: `react-rnd`. Install via `npm install react-rnd` in `labbe/`. Not currently installed.

> **Touch/iPad note**: `react-rnd` has limited touch support. The admin editor is desktop-first; tablet/iPad usage may require a Phase 2 touch-optimized interaction layer.

The editor canvas wraps each overlay in an `<Rnd>` component. Position stored as center-point percentages (`topPct`, `leftPct`) relative to canvas.

Drag position formula (converting Rnd pixel position back to % on drag end):
```js
// Called in onDragStop / onResizeStop:
const topPct = ((y + height / 2) / canvasHeight) * 100;
const leftPct = ((x + width / 2) / canvasWidth) * 100;
const widthPct = (width / canvasWidth) * 100;
const heightPct = (height / canvasHeight) * 100;
```

**Alignment guides**: draw a horizontal line at `canvasHeight * 0.5` and vertical line at `canvasWidth * 0.5` when any dragged overlay's center is within ±2% of 50% on either axis.

**Keyboard nudge**: when an overlay is selected, `ArrowKey` moves **0.5% of canvas** per press, `Shift+Arrow` moves **5% of canvas** per press. Pixel distances are meaningless across canvas sizes — percentages are the invariant unit. Implemented via `useEffect` + `keydown` listener, dispatches position update to the field config.

**Z-index / reorder**: right panel field list is drag-sortable via `@dnd-kit/sortable`. The `zIndex` field (see Section C) controls render order within the overlay layer, independent of array order. Array order is persisted.

**Snap-to-grid toggle**: optional checkbox. When on, drag positions snap to 5% increments.

**Font weight filtered by fontFamily**: when admin selects a `fontFamily` in the FieldConfigPanel, the `fontWeight` dropdown immediately filters its options to only the `weights[]` array from that font's registry entry. This prevents admin from selecting a weight the font doesn't support. The InputSelect `options` prop is computed as:
```js
const weightOptions = FONTS.find(f => f.id === selectedFontFamily)?.weights
  .map(w => ({ label: w, value: w })) ?? [];
```

**Aspect-ratio change on image replacement**: when admin uploads a new image, compare the incoming `naturalWidth/naturalHeight` ratio to the existing ratio. If they differ by more than 5%:
```js
const existingRatio = template.naturalWidth / template.naturalHeight;
const newRatio = newNaturalWidth / newNaturalHeight;
if (Math.abs(existingRatio - newRatio) / existingRatio > 0.05) {
  // show confirmation modal
}
```
Modal text uses locale keys `admin.templates.editor.aspectRatioChangeTitle` and `admin.templates.editor.aspectRatioChangeBody`. Admin chooses:
- **"Keep positions and re-tune manually"** — new image applied, overlay percentages unchanged, admin re-drags.
- **"Reset all positions to center"** — all overlays snapped to `topPct: 50, leftPct: 50`.

**"Preview as Host" toggle**: checkbox in the right panel header. When on, the canvas renders with sample data:
- `text` / `textarea` → field's `defaultValue` or `field.labelEn` as placeholder text
- `date` → today's date formatted
- `time` → `"12:00:PM"`
- `color` → field's `defaultValue` or `"#c28e5c"`
- `font` → field's `defaultValue` or first font in registry
- `number` → field's `defaultValue` or `"1"`
- `email` → field's `defaultValue` or `"user@example.com"`
- `password` → `"••••••••"` (masked placeholder — never show actual value)

When off (default), overlay slots display the field `labelEn` so admin can see which slot is which.

**Shared preview guarantee**: the read-only preview uses the same `TemplatePreviewCanvas` component as the host form. Admin always sees exactly what the host will see.

---

### A-3. Coordinate System

*(Unchanged from v4)*

**Rule**: all overlay positions and sizes are stored as percentages of the image's natural dimensions. Never store pixels.

**Fields on every overlay**:
```
topPct     — center-Y as % of natural image height    (0–100)
leftPct    — center-X as % of natural image width     (0–100)
widthPct   — overlay width as % of natural image width  (0–100)
heightPct  — overlay height as % of natural image height (0–100)
fontSizeVh — font size as % of natural image height
```

**Pixel conversion formula** (same formula everywhere):
```
renderedImageWidth  = containerWidth
renderedImageHeight = containerWidth / (naturalWidth / naturalHeight)

pixelTop    = (topPct / 100)  * renderedImageHeight   // CENTER point Y
pixelLeft   = (leftPct / 100) * renderedImageWidth    // CENTER point X
pixelWidth  = (widthPct / 100) * renderedImageWidth
pixelHeight = (heightPct / 100) * renderedImageHeight
fontSize    = (fontSizeVh / 100) * renderedImageHeight
```

The overlay is then positioned at `(pixelLeft, pixelTop)` with `transform: translate(-50%, -50%)` to center it on the anchor point.

---

### A-4. Field Type Registry

Closed set. Admin picks from these types only.

**[PATCH 2] Types**: `text`, `textarea`, `date`, `time`, `color`, `font`, `number`, `email`, `password`

**Component Discovery Table — Web**

| FieldType | Web Component | Path | RHF Integration | Emits | Error Display | Supports Props | Missing Props → Resolution |
|---|---|---|---|---|---|---|---|
| `text` | `InputGroup` | `labbe/ui/commen/inputs/inputGroup/InputGroup.js` | `useFormContext()` + `register(name)` | `string` | Internal via `useFormContext` | `label`, `placeholder`, `type`, `name`, `required`, `disabled`, `maxLength`, `error`, `value`, `onChange`, `hintMessage`, `prefixText`, `iconPath` | `inputMode` → add prop; `dir` → add prop; `min`/`max`/`step` → add props (guard: spread only when type=number); `autoCapitalize` → add prop |
| `textarea` | `TextArea` | `labbe/ui/commen/inputs/inputGroup/TextArea.js` | `useFormContext()` + `register(name)` | `string` | Internal | `label`, `placeholder`, `name`, `required`, `disabled`, `maxLength`, `rows` (default 4) | `dir` → add prop; `autoCapitalize` → add prop; RTL padding fix for prefixText |
| `date` | `DatePicker` | `labbe/ui/commen/inputs/datePicker.jsx` | `useController({ name, control })` | `Date` object | Internal | `name`, `label`, `placeholder`, `required`, `disabled`, `minDate`, `maxDate`, `ServerErrors` | None |
| `time` | `TimePicker` | `labbe/ui/commen/inputs/TimePicker.jsx` | `useController({ name, control })` | `string` in `"HH:MM:AM"` format | Internal | `label`, `name`, `required`, `hintMessage`, `className`, `style` | None |
| `color` | `ColorPickerGroup` | `labbe/ui/commen/inputs/inputGroup/ColorPickerGroup.js` | `useFormContext()` + `setValue(name, hex)` + `watch(name)` — **requires FormProvider** | `string` (hex) | Internal | `label`, `name`, `value`, `onChange`, `customColorPlaceholder`, `options` | None |
| `font` | `InputSelect` | `labbe/ui/commen/inputs/inputGroup/InputSelect.js` | `useFormContext()` + `register(name)` + `setValue` + `watch` | `string` (option value) | Internal | `label`, `placeholder`, `name`, `required`, `options`, `disabled`, `hintMessage`, `iconPath` | None |
| `number` | `InputGroup` (type="number") | same as `text` | same | `string` (browser always emits string) | Internal | same as `text` | `min`, `max`, `step` → spread only when type="number" |
| `email` | `InputGroup` (type="email") | `labbe/ui/commen/inputs/inputGroup/InputGroup.js` | same as `text` | `string` | Internal | same as `text` | default `inputMode="email"`, default `dir="ltr"` (email addresses are always LTR) |
| `password` | `InputGroup` (type="password") | `labbe/ui/commen/inputs/inputGroup/InputGroup.js` | same as `text` | `string` | Internal | same as `text` | default `dir="ltr"` |

**Component Discovery Table — Mobile**

| FieldType | Mobile Component | Path | RHF Integration | Emits | Error Display | Supports Props | Missing Props → Resolution |
|---|---|---|---|---|---|---|---|
| `text` | `TextInput` | `halla-mobile/components/commen/TextInput.js` | `useFormContext()` + internal `<Controller>` | `string` | Internal | `name`, `label`, `placeholder`, `keyboardType`, `autoCapitalize`, `disabled`, `editable`, `icon`, `...rest` | `dir` → pass as `writingDirection` style |
| `textarea` | `TextAreaInput` | `halla-mobile/components/commen/TextAreaInput.js` | same | `string` | Internal | `name`, `label`, `placeholder`, `autoCapitalize`, `disabled`, `editable`, `numberOfLines`, `maxLength`, `...rest` | `dir` → pass `writingDirection` via `...rest` |
| `date` | `DatePicker` | `halla-mobile/components/commen/DatePicker.js` | same | `Date` object | Internal | `name`, `label`, `placeholder`, `disabled`, `minimumDate`, `maximumDate`, `...rest` | None |
| `time` | `TimePicker` | `halla-mobile/components/commen/TimePicker.js` | same | `Date` object | Internal | `name`, `label`, `placeholder`, `disabled`, `...rest` | None |
| `color` | `ColorPicker` | `halla-mobile/components/commen/colorPicker.js` | same | `string` (hex) | Internal | `name`, `label`, `placeholder`, `disabled`, `showPresets` | None |
| `font` | `DropdownInput` | `halla-mobile/components/commen/DropdownInput.js` | same | `string` (option value) | Internal | `name`, `label`, `placeholder`, `options`, `disabled`, `modalTitle`, `renderItem`, `...rest` | None |
| `number` | `TextInput` (keyboardType="numeric") | same as `text` | same | `string` | Internal | same as `text` | `min`/`max`/`step` validated by zodResolver only (no `rules` prop) |
| `email` | `TextInput` (keyboardType="email-address") | `halla-mobile/components/commen/TextInput.js` | same as `text` | `string` | Internal | same as `text` | default `keyboardType="email-address"`, default `writingDirection="ltr"` |
| `password` | `TextInput` (secureTextEntry={true}) | `halla-mobile/components/commen/TextInput.js` | same as `text` | `string` | Internal | same as `text` | `secureTextEntry={true}`, default `writingDirection="ltr"` |

**inputMode → mobile keyboardType mapping table**

| `inputMode` (field schema) | RN `keyboardType` |
|---|---|
| `"text"` | `"default"` |
| `"numeric"` | `"numeric"` |
| `"decimal"` | `"decimal-pad"` |
| `"tel"` | `"phone-pad"` |
| `"email"` | `"email-address"` |
| `"url"` | `"url"` (iOS) / `"default"` (Android fallback via `Platform.select`) |

**[PATCH 4, 5, 6] InputGroup extension diff** (add `inputMode`, `dir`, `min`, `max`, `step`, `autoCapitalize` props):
```js
// labbe/ui/commen/inputs/inputGroup/InputGroup.js — extend prop signature:
const InputGroup = ({
  // ...existing props...
  maxLength,
  inputMode,          // new: "text"|"numeric"|"decimal"|"tel"|"email"|"url"
  dir,                // new: "auto"|"ltr"|"rtl" — overrides per-field direction
  autoCapitalize,     // new: "none"|"sentences"|"words"|"characters"
  min,                // new: for type="number" only
  max,                // new: for type="number" only
  step,               // new: for type="number" only
}) => {
  // [PATCH 5] dir="auto" means "let document inherit" — return undefined, do NOT set inline style
  // dir unset/undefined: falls back to project-default RTL
  // type="email" or type="password": always LTR regardless of dir prop
  const directionStyle =
    dir === "ltr" ? "ltr"
    : dir === "rtl" ? "rtl"
    : dir === "auto" ? undefined                              // inherit from document
    : (type === "email" || type === "password") ? "ltr"      // email/password always LTR
    : "rtl";                                                  // project default

  // [PATCH 4] Spread min/max/step only when type="number":
  <input
    ...
    style={directionStyle ? { direction: directionStyle } : undefined}
    inputMode={inputMode}
    autoCapitalize={autoCapitalize}
    {...(type === "number" ? { min, max, step } : {})}
    ...
  />
};
```

**[PATCH 7] TextArea extension diff** (add `dir`, `autoCapitalize`; fix RTL padding):
```js
// labbe/ui/commen/inputs/inputGroup/TextArea.js — extend prop signature:
const TextArea = ({
  // ...existing props...
  rows = 4,
  dir,                // new
  autoCapitalize,     // new: "none"|"sentences"|"words"|"characters"
}) => {
  // [PATCH 7] RTL padding fix: when prefixText is set, padding side depends on direction
  const prefixPaddingStyle = prefixText
    ? (dir === "rtl" ? { paddingRight: "9rem" } : { paddingLeft: "9rem" })
    : {};

  // [PATCH 5] dir="auto" → undefined (inherit), same logic as InputGroup
  const directionStyle =
    dir === "ltr" ? "ltr"
    : dir === "rtl" ? "rtl"
    : dir === "auto" ? undefined
    : undefined;

  <textarea
    ...
    style={{ ...prefixPaddingStyle, ...(directionStyle ? { direction: directionStyle } : {}) }}
    autoCapitalize={autoCapitalize}
  />
};
```

**Per-field config the admin sets in the right panel** (full list including new fields):

```
key             — unique identifier within template (snake_case)
type            — one of the 9 types: text|textarea|date|time|color|font|number|email|password
labelEn         — English label shown on host form
labelAr         — Arabic label shown on host form
placeholderEn   — English placeholder
placeholderAr   — Arabic placeholder
required        — boolean
minLength       — integer (for text/textarea/email)
maxLength       — integer (for text/textarea/email/password)
defaultValue    — any (pre-populated for this field)
rows            — integer, default 3; only meaningful for textarea
inputMode       — "text"|"numeric"|"decimal"|"tel"|"email"|"url"; for text/number
autoCapitalize  — "none"|"sentences"|"words"|"characters"
dir             — "auto"|"ltr"|"rtl"; default "auto"; email/password default "ltr"
min             — number; only for type=number
max             — number; only for type=number
step            — number; only for type=number
fontSizeVh      — font size on canvas (% of image height)
fontFamily      — font registry id; if null falls back to host's fontType field value
fontWeight      — filtered to the selected font's weights[]
textAlign       — "left" | "center" | "right"
colorBinding    — "primary" | "custom"
overlay         — { topPct, leftPct, widthPct, heightPct, zIndex } — set via canvas drag
```

**fontFamily fallback rule**: if `fontFamily` is null on an overlay, the rendered text uses the value of the host's `fontType` form field (the per-event font selector that the host fills in during StepThree). This means admin can pin a specific font on a specific overlay, or leave it host-controlled.

**Admin editor field-type conditional controls**:
- When `type === "textarea"`: show "Rows" number input in right panel.
- When `type === "text"` or `"number"` or `"email"`: show "Input Mode" dropdown.
- When `type === "number"`: show Min, Max, Step number inputs.
- When admin selects a `fontFamily`: immediately filter the `fontWeight` dropdown options to that font's `weights[]` array.
- `email` and `password` fields show no dir control (always LTR).

---

### A-5. Decorations Subsystem

*(Unchanged from v4)*

Each decoration:
```
type      — "icon" | "image"
source    — Lucide icon name (e.g., "Heart") or image URL
color     — hex color string (only for icons)
topPct    — center-Y % of natural image height
leftPct   — center-X % of natural image width
widthPct  — width % of natural image width
heightPct — height % of natural image height
zIndex    — integer, default 0; controls render order within the decoration layer
```

**Render order** (bottom to top):
1. Background image (the JPG)
2. Decorations — sorted by `zIndex ASC`, then array order as tiebreaker
3. Text overlays — sorted by `zIndex ASC`, then array order as tiebreaker

In the admin editor, decorations are draggable with `react-rnd`. A "Decorations" tab in the right panel lets admin add/remove/configure them, including the `zIndex` value.

**Phase 1 scope**: Lucide icon set only.

---

### A-6. Font Registry

*(Unchanged from v4)*

**New endpoint**: `GET /api/fonts` — public, no auth required.

**Static config file**: `labbe-backend-/src/shared/constants/fontRegistry.js`.

**Display names moved to locale files**: `fontRegistry.js` no longer carries `displayNameEn` or `displayNameAr`. Frontend resolves via `t('fonts.' + font.id + '.displayName')`.

**Canonical font set**:

| id | webFamily | mobileFamily | supportsArabic | weights |
|---|---|---|---|---|
| `cairo` | `'Cairo', sans-serif` | `Cairo` | true | `["400","600","700"]` |
| `inter` | `'Inter', sans-serif` | `Inter` | false | `["400","500","700"]` |
| `lato` | `'Lato', sans-serif` | `Lato` | false | `["400","700"]` |
| `amiri` | `'Amiri', serif` | `Amiri` | true | `["400","700"]` |
| `ibm_plex_arabic` | `'IBM Plex Sans Arabic', sans-serif` | `IBMPlexSansArabic` | true | `["400","500","700"]` |
| `noto_sans_arabic` | `'Noto Sans Arabic', sans-serif` | `NotoSansArabic` | true | `["400","700"]` |

```js
const FONTS = [
  { id: "cairo",            webFamily: "'Cairo', sans-serif",                 mobileFamily: "Cairo",             supportsArabic: true,  weights: ["400","600","700"] },
  { id: "inter",            webFamily: "'Inter', sans-serif",                  mobileFamily: "Inter",             supportsArabic: false, weights: ["400","500","700"] },
  { id: "lato",             webFamily: "'Lato', sans-serif",                   mobileFamily: "Lato",              supportsArabic: false, weights: ["400","700"] },
  { id: "amiri",            webFamily: "'Amiri', serif",                       mobileFamily: "Amiri",             supportsArabic: true,  weights: ["400","700"] },
  { id: "ibm_plex_arabic",  webFamily: "'IBM Plex Sans Arabic', sans-serif",   mobileFamily: "IBMPlexSansArabic", supportsArabic: true,  weights: ["400","500","700"] },
  { id: "noto_sans_arabic", webFamily: "'Noto Sans Arabic', sans-serif",       mobileFamily: "NotoSansArabic",    supportsArabic: true,  weights: ["400","700"] },
];
module.exports = { FONTS };
```

**html2canvas font fix**: `await document.fonts.ready` before capture.

---

### A-7. Image Storage on AWS S3

*(Unchanged from v4 except as noted)*

**Bucket structure**:
```
s3://{bucket}/templates/{templateObjectId}/original-{filename}
s3://{bucket}/templates/{templateObjectId}/thumb-{filename}.webp
```

**Upload flow — presigned POST**

Use `createPresignedPost` from `@aws-sdk/s3-presigned-post`.

**Step 1 — backend generates presigned POST**:
```js
// adminTemplates.controller.js — uploadUrl handler
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getUploadUrl(req, res) {
  const { filename, contentType } = req.body;
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
    return res.status(400).json({ success: false, error: "INVALID_FILE_TYPE" });
  }
  const templateId = req.query.templateId || "new";
  const s3Key = `templates/${templateId}/original-${Date.now()}-${filename}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 3600,
  });

  res.json({ success: true, url, fields, s3Key });
}
```

**Step 2 — browser uploads via multipart form POST**:
```js
async function uploadToS3(presignedData, file) {
  const { url, fields } = presignedData;
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", file);  // file must be last

  const xhr = new XMLHttpRequest();
  xhr.open("POST", url);
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      setUploadProgress(percent);
    }
  };
  return new Promise((resolve, reject) => {
    xhr.onload = () => xhr.status === 204 ? resolve() : reject(new Error("Upload failed"));
    xhr.onerror = reject;
    xhr.send(formData);
  });
}
```

S3 returns HTTP 204 on success. Files exceeding 5 MB return HTTP 400 from S3 before any bytes are stored.

**imageUrl fallback**:
- CloudFront provisioned: `imageUrl = "https://{cloudfront-domain}/{s3Key}"`
- CloudFront not provisioned: `imageUrl = "https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}"`

Configure the S3 bucket CORS:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["POST", "GET", "HEAD"],
  "AllowedOrigins": ["https://your-production-domain.com", "http://localhost:3000"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]
```

> **Critical**: Express `app.use("/public", cors())` does **not** apply to S3 traffic. S3 CORS is configured at the bucket level in AWS.

**New dependency**: `@aws-sdk/s3-presigned-post`. `sharp` also required.

**Virus scan**: `// TODO: integrate S3 ClamAV scan Lambda trigger`

---

### A-7.1. Orphan Cleanup [NEW — PATCH 3]

**Problem**: if the backend throws after a file is uploaded to S3 but before the DB write commits (e.g., sharp processing error, validation failure, network drop), the S3 object becomes an orphan — it has no corresponding `imageS3Key` or `thumbnailS3Key` in the Template collection.

**Inline cleanup (controller-level)**:

Every `POST /api/admin/templates` and `PUT /api/admin/templates/:id` controller wraps the post-upload work (sharp processing + thumbnail generation + DB write) in a `try/catch`. On any throw, call `DeleteObjectCommand` for the new S3 key **before** re-throwing:

```js
// adminTemplates.controller.js — createTemplate / updateTemplate
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

async function createTemplate(req, res) {
  const { s3Key, ...templateFields } = req.body;
  try {
    // sharp processing
    const { thumbnailS3Key, naturalWidth, naturalHeight } = await processImage(s3Key);
    // DB write
    const template = await Template.create({ ...templateFields, imageS3Key: s3Key, thumbnailS3Key, naturalWidth, naturalHeight });
    res.json({ success: true, template });
  } catch (err) {
    // Clean up the uploaded S3 object before responding with error
    if (s3Key) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key })).catch(() => {});
    }
    throw err;
  }
}
```

The same pattern applies to `updateTemplate` when a new `s3Key` is provided and the update fails.

**Daily garbage-collection job**:

**File**: `labbe-backend-/scripts/gcOrphanTemplateImages.js`

The script:
1. Lists all S3 keys under `templates/*` with `last-modified > 24h` ago (using `ListObjectsV2Command` with prefix `templates/`).
2. For each key, checks whether any Template document has a matching `imageS3Key` or `thumbnailS3Key`.
3. Deletes any key with no matching DB record.

```js
// labbe-backend-/scripts/gcOrphanTemplateImages.js
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const mongoose = require("mongoose");
const Template = require("../src/modules/templates/TemplateModel");
require("dotenv").config();

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function gcOrphans() {
  await mongoose.connect(process.env.MONGO_URI);

  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  const listed = [];
  let continuationToken;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: "templates/",
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.LastModified < cutoff) listed.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  const knownKeys = new Set(
    (await Template.find({}, { imageS3Key: 1, thumbnailS3Key: 1 }).lean())
      .flatMap(t => [t.imageS3Key, t.thumbnailS3Key].filter(Boolean))
  );

  const orphans = listed.filter(k => !knownKeys.has(k));
  console.log(`Found ${orphans.length} orphan(s) of ${listed.length} listed keys`);

  for (const key of orphans) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log(`Deleted orphan: ${key}`);
  }

  await mongoose.disconnect();
}

gcOrphans().catch(err => { console.error(err); process.exit(1); });
```

**Scheduling**: run via AWS EventBridge (cron rule targeting a Lambda or ECS task) or a server-side cron (`node-cron` / system cron calling `node scripts/gcOrphanTemplateImages.js`). Daily cadence is sufficient.

---

### A-8. Snapshotting on Event Creation

*(Logic unchanged from v4; updated to reference email/password types)*

When a host saves their event, the backend snapshots the full Template into `event.invitationSettings.visualTemplate`. The snapshot includes all fields from Section C, including `rows`, `inputMode`, `autoCapitalize`, `dir`, `min`, `max`, `step` on each field and `zIndex` on each overlay.

Before snapshotting, `validateTemplateData` (Section A-12) must pass. If validation fails, the entire save is rejected with a 400 error.

**Time field canonical format**: `visualTemplate.data[key]` for a `time` field is always stored as the `"H:MM:AM"` string (e.g. `"12:30:PM"`).

**Snapshot trigger**: `events.service.js` → `createEvent` and `updateInvitationSettings`.

---

### A-9. Rendering Pipeline Decision

*(Unchanged from v4 — Option A: html2canvas / react-native-view-shot)*

---

### A-10. Admin REST API

*(Unchanged from v4)*

All admin template routes: `/api/admin/templates`. Public host-facing: `/api/templates`.

---

**`POST /api/admin/templates/upload-url`**
- RBAC: `requirePageAccess(ADMIN_PAGES.TEMPLATES, 'create')`
- **Rate limit**: 30 requests/hour per user.
  ```js
  const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => req.user._id.toString(),
    message: { success: false, error: "RATE_LIMIT_EXCEEDED" },
  });
  router.post('/admin/templates/upload-url', authenticate, requirePageAccess(...), uploadRateLimiter, controller.getUploadUrl);
  ```
- Body: `{ filename: string, contentType: string }`
- Validation: contentType matches `^image/(jpeg|png|webp)$`; filename max 200 chars.
- Response: `{ url, fields, s3Key }` (presigned POST shape).

---

**`POST /api/admin/templates`**
- RBAC: `requirePageAccess(ADMIN_PAGES.TEMPLATES, 'create')`
- Body includes all template fields; controller calls `sharp`, generates thumbnail, sets `imageUrl`, `thumbnailUrl`, `createdBy`, `version: 0`, `sortOrder: 0`.
- **Wrapped in try/catch with S3 orphan cleanup** (see A-7.1).

---

**`GET /api/admin/templates`**
- RBAC: `requirePageAccess(ADMIN_PAGES.TEMPLATES, 'view')`
- Query: `?category=string`, `?search=string`, `?includeInactive=true`, `?includeDeleted=true` (super_admin only).
- **Semantics**:
  - `active: false` = draft/unpublished.
  - `deletedAt != null` = soft-deleted.
- Default filter: `{ deletedAt: null }`.

---

**`GET /api/admin/templates/:id`** — unchanged.

**`PUT /api/admin/templates/:id`** — unchanged except wrapped in try/catch with S3 orphan cleanup when `imageS3Key` changes.

**`POST /api/admin/templates/:id/duplicate`** — unchanged.

**`DELETE /api/admin/templates/:id`** — soft delete only; unchanged.

---

**`GET /api/templates`** (public host-facing)
- Filter: `{ active: true, deletedAt: null }`. Optional `?category=` filter.
- Sort: `sortOrder ASC`, `createdAt DESC` as tiebreaker.
- Does NOT return `imageS3Key`, `createdBy`, `updatedBy`, `version`.

---

**`GET /api/templates/categories`** — public, no auth. Unchanged.

**`GET /api/fonts`** — public, no auth. Returns `FONTS` array (no `displayNameEn`/`displayNameAr`).

---

### A-11. Categories Subsystem

*(Unchanged from v4)*

---

### A-12. Visual Template Data Validation

**File**: `labbe-backend-/src/modules/events/templateDataValidator.js`

**[PATCH 2]** Updated to add `email` regex validation and `password` maxLength check:

```js
// labbe-backend-/src/modules/events/templateDataValidator.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateTemplateData(tpl, hostData) {
  const errors = [];
  const validKeys = new Set(tpl.fields.map(f => f.key));

  // Reject unknown keys
  for (const key of Object.keys(hostData)) {
    if (!validKeys.has(key)) {
      errors.push(`Unknown field key: "${key}"`);
    }
  }

  for (const field of tpl.fields) {
    const value = hostData[field.key];
    const isEmpty = value === undefined || value === null || value === "";

    // Required validation
    if (field.required && isEmpty) {
      errors.push(`Field "${field.key}" is required`);
      continue;
    }
    if (isEmpty) continue;

    const strVal = String(value);

    // minLength / maxLength (for text, textarea, email, password)
    if (["text", "textarea", "email", "password"].includes(field.type)) {
      if (field.minLength && strVal.length < field.minLength) {
        errors.push(`Field "${field.key}" must be at least ${field.minLength} characters`);
      }
      if (field.maxLength && strVal.length > field.maxLength) {
        errors.push(`Field "${field.key}" must be at most ${field.maxLength} characters`);
      }
    }

    // email: format check
    if (field.type === "email" && !EMAIL_REGEX.test(strVal)) {
      errors.push(`Field "${field.key}" must be a valid email address`);
    }

    // number: min / max
    if (field.type === "number") {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`Field "${field.key}" must be a number`);
      } else {
        if (field.min !== undefined && num < field.min) {
          errors.push(`Field "${field.key}" must be ≥ ${field.min}`);
        }
        if (field.max !== undefined && num > field.max) {
          errors.push(`Field "${field.key}" must be ≤ ${field.max}`);
        }
      }
    }

    // color: hex format
    if (field.type === "color" && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(strVal)) {
      errors.push(`Field "${field.key}" must be a valid hex color`);
    }
  }

  if (errors.length > 0) {
    const err = new Error("Template data validation failed");
    err.statusCode = 400;
    err.validationErrors = errors;
    throw err;
  }
}

module.exports = { validateTemplateData };
```

---

## Section B — Bugs Fixed

### B-12 through B-16

*(Unchanged from v4)*

---

### B-17. Migration Script for Old Events

**Shared constant**:

```js
// labbe-backend-/src/shared/constants/initialTemplateNames.js
const INITIAL_TEMPLATE_NAMES = {
  CLASSIC_WEDDING:  { en: "Classic Wedding",  ar: "زفاف كلاسيكي" },
  WEDDING_PARTY:    { en: "Wedding Party",    ar: "حفل زفاف" },
  ENGAGEMENT:       { en: "Engagement",       ar: "خطوبة" },
  GOLDEN_BIRTHDAY:  { en: "Golden Birthday",  ar: "عيد ميلاد ذهبي" },
  BABY_SHOWER:      { en: "Baby Shower",      ar: "استقبال مولود" },
  GENERAL:          { en: "General",          ar: "عام" },
};
module.exports = { INITIAL_TEMPLATE_NAMES };
```

**Updated migration script**:

```js
// labbe-backend-/scripts/migrateVisualTemplates.js
const { INITIAL_TEMPLATE_NAMES: N } = require("../src/shared/constants/initialTemplateNames");

const OLD_ID_TO_NAME = {
  1: N.CLASSIC_WEDDING.en,
  2: N.WEDDING_PARTY.en,
  3: N.CLASSIC_WEDDING.en,  // best-effort fallback
};
```

---

### B-18. Color Regex + Dynamic Zod Schema

Color regex fix: `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`

**[PATCH 8] FONT_IDS source note**: `FONT_IDS` is exported from `labbe/config/fonts.js`, a frontend module that mirrors the `GET /api/fonts` response. It is hydrated at app boot via a React Query call cached for the session.

**[PATCH 2] Updated `buildDynamicTemplateSchema`** — adds `email` and `password` branches:

```js
// labbe/utils/schemas/createEventSchema.js
import { z } from "zod";
import { FONT_IDS } from "@/config/fonts"; // hydrated from GET /api/fonts, cached for session

const colorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const buildDynamicTemplateSchema = (fields, t) => {
  const shape = {};
  for (const field of fields) {
    let schema;
    switch (field.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength, t("templates.fields.validation.minLength", { min: field.minLength }));
        if (field.maxLength) s = s.max(field.maxLength, t("templates.fields.validation.maxLength", { max: field.maxLength }));
        schema = field.required ? s.min(1, t("templates.fields.validation.required")) : s.optional();
        break;
      }
      case "email": {
        // z.string().email() validates format; minLength/maxLength also apply
        let s = z.string().email(t("templates.fields.validation.invalidEmail"));
        if (field.minLength) s = s.min(field.minLength, t("templates.fields.validation.minLength", { min: field.minLength }));
        if (field.maxLength) s = s.max(field.maxLength, t("templates.fields.validation.maxLength", { max: field.maxLength }));
        schema = field.required ? s.min(1, t("templates.fields.validation.required")) : s.optional();
        break;
      }
      case "password": {
        // Password is a plain string; no email-format check; maxLength applies
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength, t("templates.fields.validation.minLength", { min: field.minLength }));
        if (field.maxLength) s = s.max(field.maxLength, t("templates.fields.validation.maxLength", { max: field.maxLength }));
        schema = field.required ? s.min(1, t("templates.fields.validation.required")) : s.optional();
        break;
      }
      case "date":
        schema = field.required
          ? z.date({ required_error: t("templates.fields.validation.required") })
          : z.date().nullable().optional();
        break;
      case "time":
        // Web TimePicker emits "HH:MM:AM" string
        schema = field.required
          ? z.string().regex(/^\d{1,2}:\d{2}:(AM|PM)$/, t("templates.fields.validation.required"))
          : z.string().optional();
        break;
      case "color":
        schema = field.required
          ? z.string().regex(colorRegex, t("templates.fields.validation.invalidColor"))
          : z.string().regex(colorRegex, t("templates.fields.validation.invalidColor")).optional();
        break;
      case "font":
        schema = z.enum(FONT_IDS, { errorMap: () => ({ message: t("templates.fields.validation.required") }) });
        if (!field.required) schema = schema.optional();
        break;
      case "number": {
        // Empty-string trap: z.coerce.number("") === 0, so blank optional → undefined first
        let s = z.coerce.number({ invalid_type_error: t("templates.fields.validation.invalidNumber") });
        if (field.min !== undefined) s = s.min(field.min);
        if (field.max !== undefined) s = s.max(field.max);
        schema = field.required
          ? s
          : z.preprocess(v => v === "" ? undefined : v, s.optional());
        break;
      }
      default:
        schema = z.any();
    }
    shape[field.key] = schema;
  }
  return z.object(shape);
};
```

**[PATCH 13] Time field wire format with edge-case comments**:

The canonical value stored in `event.invitationSettings.visualTemplate.data[key]` and passed to the API is always the `"H:MM:AM"` string.

```js
// halla-mobile/utils/timeFormat.js — shared on mobile only

/**
 * Parse "H:MM:AM" / "H:MM:PM" stored string back to a Date for the mobile TimePicker.
 *
 * Edge cases:
 *   "12:00:AM" → midnight (00:00) — 12 AM is 0 in 24h
 *   "12:00:PM" → noon   (12:00) — 12 PM stays 12 in 24h
 *
 * Round-trip invariant: parseTimeString(dateToTimeString(d)) equals d at minute resolution.
 * Test: parseTimeString("12:00:AM").getHours() === 0
 *       parseTimeString("12:00:PM").getHours() === 12
 */
function parseTimeString(str) {
  const [h, m, period] = str.split(":");
  let hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;  // 12:XX:AM → midnight
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
}

/**
 * Convert a Date from the mobile TimePicker to canonical "H:MM:AM" string.
 *
 * Edge cases:
 *   d.getHours() === 0  → "12:XX:AM" (midnight maps to 12 AM)
 *   d.getHours() === 12 → "12:XX:PM" (noon maps to 12 PM)
 *
 * Round-trip invariant: dateToTimeString(parseTimeString(s)) === s
 * Test: dateToTimeString(new Date set to 00:00) === "12:00:AM"
 *       dateToTimeString(new Date set to 12:00) === "12:00:PM"
 */
function dateToTimeString(d) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h % 12) || 12).toString();  // 0→12, 13→1, 12→12
  return `${h12}:${m}:${period}`;
}

module.exports = { parseTimeString, dateToTimeString };
```

**Mobile Zod schema for `time`**:
```js
// Mobile buildDynamicTemplateSchema — time branch
case "time":
  // Mobile TimePicker emits Date; schema validates the Date object.
  // dateToTimeString conversion happens in the submit handler before the API call.
  schema = field.required
    ? z.date({ required_error: t("templates.fields.validation.required") })
    : z.date().nullable().optional();
  break;
```

**Mobile StepThree submit handler** — convert all time fields before API call:

```js
// halla-mobile/components/createEvent/StepThree.js — onSubmit
import { dateToTimeString } from "../../utils/timeFormat";

const onSubmit = async (data) => {
  const converted = { ...data };
  for (const field of template.fields) {
    if (field.type === "time" && converted[field.key] instanceof Date) {
      converted[field.key] = dateToTimeString(converted[field.key]);
    }
  }
  await createEvent({ ...eventData, templateData: converted });
};
```

---

### B-19. buildDefaultValues — Switch on field.type

*(Unchanged from v4 except email/password fall through to default `""` which is correct)*

```js
const buildDefaultValues = (template, parentEventDate, parentEventTime) => {
  if (!template?.fields) return {};
  return template.fields.reduce((acc, field) => {
    const saved = template?.data?.[field.key];
    let defaultVal;
    switch (field.type) {
      case "date":
        defaultVal = saved ? new Date(saved) : (parentEventDate ? new Date(parentEventDate) : null);
        break;
      case "time":
        defaultVal = saved ?? parentEventTime ?? "12:00:AM";
        break;
      case "font":
        defaultVal = saved ?? field.defaultValue ?? "cairo";
        break;
      case "color":
        defaultVal = saved ?? field.defaultValue ?? "#c28e5c";
        break;
      case "number":
        defaultVal = saved ?? field.defaultValue ?? "";
        break;
      // email, password, text, textarea: empty string default
      default:
        defaultVal = saved ?? field.defaultValue ?? "";
    }
    acc[field.key] = defaultVal;
    return acc;
  }, {});
};
```

**Mobile override for time**: same as v4 (uses `parseTimeString`).

---

### B-20 through B-22

*(Unchanged from v4)*

---

## Section C — Data Models

### Template (Mongoose) — Full Schemas

**File**: `labbe-backend-/models/TemplateModel.js`

**[PATCH 2]** `type` enum updated to include `email` and `password`:

```js
const mongoose = require("mongoose");

const fieldDefSchema = new mongoose.Schema({
  key:            { type: String, required: true },
  type:           { type: String, enum: ["text","textarea","date","time","color","font","number","email","password"], required: true },
  labelEn:        { type: String, required: true },
  labelAr:        { type: String, required: true },
  placeholderEn:  { type: String },
  placeholderAr:  { type: String },
  required:       { type: Boolean, default: false },
  minLength:      { type: Number },
  maxLength:      { type: Number },
  defaultValue:   { type: mongoose.Schema.Types.Mixed },
  rows:           { type: Number, default: 3 },
  inputMode:      { type: String, enum: ["text","numeric","decimal","tel","email","url"] },
  autoCapitalize: { type: String, enum: ["none","sentences","words","characters"] },
  dir:            { type: String, enum: ["auto","ltr","rtl"], default: "auto" },
  min:            { type: Number },
  max:            { type: Number },
  step:           { type: Number },
}, { _id: false });

const overlaySchema = new mongoose.Schema({
  fieldKey:     { type: String, required: true },
  topPct:       { type: Number, required: true, min: 0, max: 100 },
  leftPct:      { type: Number, required: true, min: 0, max: 100 },
  widthPct:     { type: Number, min: 0, max: 100 },
  heightPct:    { type: Number, min: 0, max: 100 },
  fontSizeVh:   { type: Number, min: 0 },
  fontWeight:   { type: String, enum: ["normal","bold","100","200","300","400","500","600","700","800","900"], default: "normal" },
  textAlign:    { type: String, enum: ["left","center","right"], default: "center" },
  colorBinding: { type: String, enum: ["primary","custom"], default: "primary" },
  color:        { type: String, validate: { validator: v => !v || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) } },
  fontFamily:   { type: String },
  zIndex:       { type: Number, default: 0 },
}, { _id: false });

const decorationSchema = new mongoose.Schema({
  type:      { type: String, enum: ["icon","image"], required: true },
  source:    { type: String, required: true },
  color:     { type: String },
  topPct:    { type: Number, required: true, min: 0, max: 100 },
  leftPct:   { type: Number, required: true, min: 0, max: 100 },
  widthPct:  { type: Number, required: true, min: 0, max: 100 },
  heightPct: { type: Number, required: true, min: 0, max: 100 },
  zIndex:    { type: Number, default: 0 },
}, { _id: false });

const templateSchema = new mongoose.Schema({
  nameEn:         { type: String, required: true },
  nameAr:         { type: String, required: true },
  categories:     { type: [String], required: true, validate: v => v.length > 0 },
  imageUrl:       { type: String, required: true },
  imageS3Key:     { type: String, required: true },
  thumbnailUrl:   { type: String },
  thumbnailS3Key: { type: String },
  naturalWidth:   { type: Number, required: true },
  naturalHeight:  { type: Number, required: true },
  fields:         { type: [fieldDefSchema], default: [] },
  overlays:       { type: [overlaySchema], default: [] },
  decorations:    { type: [decorationSchema], default: [] },
  sortOrder:      { type: Number, default: 0 },
  active:         { type: Boolean, default: true },
  deletedAt:      { type: Date, default: null },
  deletedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  version:        { type: Number, default: 0 },
}, { timestamps: true });

templateSchema.index({ categories: 1, active: 1, deletedAt: 1 });
templateSchema.index({ nameEn: "text", nameAr: "text" });
templateSchema.index({ sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("Template", templateSchema);
```

---

### TemplateCategory (Mongoose)

*(Unchanged from v4)*

---

### EventModel — visualTemplate Snapshot Shape

**[PATCH 2]** `snapshotFieldSchema.type` is `String` (no enum constraint — snapshots are immutable, enum only on the live model):

```js
const snapshotOverlaySchema = new mongoose.Schema({
  fieldKey:     String,
  topPct:       Number,
  leftPct:      Number,
  widthPct:     Number,
  heightPct:    Number,
  fontSizeVh:   Number,
  fontWeight:   String,
  textAlign:    String,
  colorBinding: String,
  color:        String,
  fontFamily:   String,
  zIndex:       { type: Number, default: 0 },
}, { _id: false });

const snapshotFieldSchema = new mongoose.Schema({
  key:            String,
  type:           String,  // no enum — snapshots are read-only historical records
  labelEn:        String,
  labelAr:        String,
  placeholderEn:  String,
  placeholderAr:  String,
  required:       Boolean,
  minLength:      Number,
  maxLength:      Number,
  defaultValue:   mongoose.Schema.Types.Mixed,
  rows:           Number,
  inputMode:      String,
  autoCapitalize: String,
  dir:            String,
  min:            Number,
  max:            Number,
  step:           Number,
}, { _id: false });

const snapshotDecorationSchema = new mongoose.Schema({
  type: String, source: String, color: String,
  topPct: Number, leftPct: Number, widthPct: Number, heightPct: Number,
  zIndex: { type: Number, default: 0 },
}, { _id: false });

const visualTemplateSchema = new mongoose.Schema({
  templateId:    { type: mongoose.Schema.Types.ObjectId },
  nameEn:        String,
  nameAr:        String,
  categories:    [String],
  imageUrl:      String,
  thumbnailUrl:  String,
  naturalWidth:  Number,
  naturalHeight: Number,
  fields:        [snapshotFieldSchema],
  overlays:      [snapshotOverlaySchema],
  decorations:   [snapshotDecorationSchema],
  data:          { type: mongoose.Schema.Types.Mixed, default: {} },
  id:            mongoose.Schema.Types.Mixed,
  src:           String,
}, { _id: false });
```

---

## Section D — Frontend: Admin Template Manager

### Route and File Structure

```
labbe/app/[lang]/admin-dash/templates/
  page.js
  [id]/page.js
  categories/page.js

labbe/app/[lang]/admin-dash/templates/_components/
  TemplatesPageContent.jsx
  TemplateEditorPage.jsx
  TemplateEditorCanvas.jsx
  FieldConfigPanel.jsx
  DecorationPanel.jsx
  CategoryManager.jsx
  TemplateListRow.jsx
  TemplateSearchBar.jsx

labbe/components/shared/
  TemplatePreviewCanvas.jsx
  OverlayItem.jsx
```

### State Management

**[PATCH 10] RHF mode**: use `useForm({ mode: "onSubmit", resolver: zodResolver(...) })` in the admin editor form. The admin editor form has 300+ registered paths (one per field × all config properties); `onChange` validation at that scale will lag the canvas interaction. `onSubmit` mode defers all validation to the Save action.

```js
// TemplateEditorPage.jsx
const methods = useForm({
  mode: "onSubmit",
  resolver: zodResolver(templateEditorSchema),
  defaultValues: buildEditorDefaultValues(template),
});
```

**[PATCH 9] FormProvider placement**: `TemplateEditorPage.jsx` wraps the entire two-pane editor in `<FormProvider>` from `react-hook-form`. `ColorPickerGroup` uses `useFormContext()` internally and will throw a runtime error if rendered outside a `FormProvider`. All child components (`TemplateEditorCanvas`, `FieldConfigPanel`, `DecorationPanel`) are descendants of this single `FormProvider`.

```jsx
// TemplateEditorPage.jsx
import { FormProvider, useForm } from "react-hook-form";

export default function TemplateEditorPage({ template }) {
  const methods = useForm({ mode: "onSubmit", resolver: zodResolver(templateEditorSchema) });
  return (
    <FormProvider {...methods}>
      <div className="editor-layout">
        <TemplateEditorCanvas />
        <FieldConfigPanel />
      </div>
    </FormProvider>
  );
}
```

### FieldConfigPanel — Component Inventory (Section 8.5)

**[PATCH 14]** Action buttons must use `labbe/ui/commen/button/Button.jsx`. No raw `<button>` elements anywhere in new admin template components.

Every control in the right panel uses an existing component from the catalogue. No raw `<input>`, `<select>`, or `<textarea>` elements.

| Panel Control | Existing Component | Props to pass |
|---|---|---|
| Template Name (EN) | `InputGroup` | `name="nameEn"`, `type="text"`, `label={t(...)}` |
| Template Name (AR) | `InputGroup` | `name="nameAr"`, `type="text"`, `label={t(...)}`, `dir="rtl"` |
| Categories (multi-select) | `InputSelect` | `name="categories"`, `options={categoryOptions}` |
| Active Toggle | `ToggelInput` (`labbe/ui/commen/inputs/toggelInput/ToggelInput.js`) | `name="active"` |
| Sort Order | `InputGroup` | `name="sortOrder"`, `type="number"`, `min={0}` |
| Field Key | `InputGroup` | `name={fieldPath("key")}`, `type="text"` |
| Field Type | `InputSelect` | `name={fieldPath("type")}`, `options={TYPE_OPTIONS}` |
| English Label | `InputGroup` | `name={fieldPath("labelEn")}`, `type="text"` |
| Arabic Label | `InputGroup` | `name={fieldPath("labelAr")}`, `type="text"`, `dir="rtl"` |
| English Placeholder | `InputGroup` | `name={fieldPath("placeholderEn")}`, `type="text"` |
| Arabic Placeholder | `InputGroup` | `name={fieldPath("placeholderAr")}`, `type="text"`, `dir="rtl"` |
| Required Toggle | `ToggelInput` | `name={fieldPath("required")}` |
| Min Length | `InputGroup` | `name={fieldPath("minLength")}`, `type="number"` |
| Max Length | `InputGroup` | `name={fieldPath("maxLength")}`, `type="number"` |
| Default Value | `InputGroup` | `name={fieldPath("defaultValue")}`, `type="text"` |
| **Rows** (only when type=textarea) | `InputGroup` | `name={fieldPath("rows")}`, `type="number"`, `min={1}` |
| **Input Mode** (only when type=text/number/email) | `InputSelect` | `name={fieldPath("inputMode")}`, `options={INPUT_MODE_OPTIONS}` |
| **Dir** (not shown for email/password — always LTR) | `InputSelect` | `name={fieldPath("dir")}`, `options={DIR_OPTIONS}` |
| **Min** (only when type=number) | `InputGroup` | `name={fieldPath("min")}`, `type="number"` |
| **Max** (only when type=number) | `InputGroup` | `name={fieldPath("max")}`, `type="number"` |
| **Step** (only when type=number) | `InputGroup` | `name={fieldPath("step")}`, `type="number"` |
| Font Family | `InputSelect` | `name={overlayPath("fontFamily")}`, `options={fontOptions}` |
| Font Weight | `InputSelect` | `name={overlayPath("fontWeight")}`, `options={weightOptions}` |
| Font Size | `InputGroup` | `name={overlayPath("fontSizeVh")}`, `type="number"` |
| Text Align | `InputSelect` | `name={overlayPath("textAlign")}`, `options={[left/center/right]}` |
| Color Binding | `InputSelect` | `name={overlayPath("colorBinding")}`, `options={[primary/custom]}` |
| Custom Color (when colorBinding=custom) | `ColorPickerGroup` | `name={overlayPath("color")}` |
| **zIndex** | `InputGroup` | `name={overlayPath("zIndex")}`, `type="number"` |
| Position (X %, Y %) | `InputGroup` × 2 | `type="number"`, `min={0}`, `max={100}` |
| Width %, Height % | `InputGroup` × 2 | `type="number"`, `min={0}`, `max={100}` |
| **Add Field button** | `Button` (`labbe/ui/commen/button/Button.jsx`) | action button — no raw `<button>` |
| **Add Decoration button** | `Button` (`labbe/ui/commen/button/Button.jsx`) | action button — no raw `<button>` |

### Image Upload UX in Editor

*(Unchanged from v4 — upload uses multipart form POST)*

### Save Flow

**[PATCH 11] Unsaved-changes guard**: use `useBeforeUnload(formState.isDirty)` on the editor page to warn admin before navigating away with unsaved changes. This prevents accidental data loss when the admin has modified the template but not yet saved.

```js
// TemplateEditorPage.jsx
import { useBeforeUnload } from "react-router-dom"; // or Next.js equivalent

const { formState } = useFormContext();
useBeforeUnload(
  formState.isDirty,
  "You have unsaved changes. Are you sure you want to leave?"
);
```

> **Note**: Next.js does not include `useBeforeUnload` natively. Use the `beforeunload` window event directly or a library like `react-use` (`useBeforeUnload` from `react-use`). Also hook into Next.js router events to catch SPA navigation: `router.events.on("routeChangeStart", handleRouteChange)`.

*(Rest of Save Flow unchanged from v4)*

---

## Section E — Frontend: Host StepThree (Web + Mobile)

### Web — TemplateForm.jsx — renderField

**[PATCH 9] FormProvider placement**: `TemplateForm.jsx` wraps the StepThree form section in `<FormProvider>`. The `StepThree.js` parent does NOT need a FormProvider since it uses its own RHF context for event-level fields (date, eventType, etc.) — these are separate form scopes. `TemplateForm.jsx` creates and owns its own FormProvider for template-specific fields only.

```jsx
// labbe/app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function TemplateForm({ template, onSubmit }) {
  const methods = useForm({
    resolver: zodResolver(buildDynamicTemplateSchema(template.fields, t)),
    defaultValues: buildDefaultValues(template),
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {template.fields.map(field => renderField(field, locale))}
      </form>
    </FormProvider>
  );
}
```

The `renderField(field, locale)` function integrates with each existing component's exact RHF pattern. No double-wrapping. No raw HTML elements.

```jsx
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import ColorPickerGroup from "@/ui/commen/inputs/inputGroup/ColorPickerGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";

function renderField(field, locale) {
  const label = locale === "ar" ? field.labelAr : field.labelEn;
  const placeholder = locale === "ar" ? field.placeholderAr : field.placeholderEn;
  const name = field.key;

  switch (field.type) {
    case "text":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="text"
          required={field.required}
          maxLength={field.maxLength}
          inputMode={field.inputMode}
          dir={field.dir}
          autoCapitalize={field.autoCapitalize}
        />
      );

    case "textarea":
      return (
        <TextArea
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
          maxLength={field.maxLength}
          rows={field.rows ?? 3}
          dir={field.dir}
          autoCapitalize={field.autoCapitalize}
        />
      );

    case "date":
      return (
        <DatePicker
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
        />
      );

    case "time":
      return (
        <TimePicker
          key={name}
          name={name}
          label={label}
          required={field.required}
        />
      );

    case "color":
      return (
        <ColorPickerGroup
          key={name}
          name={name}
          label={label}
          customColorPlaceholder={placeholder}
          options={true}
        />
      );

    case "font": {
      const fontOptions = fonts.map(f => ({
        label: t(`fonts.${f.id}.displayName`),
        value: f.id,
      }));
      return (
        <InputSelect
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
          options={fontOptions}
        />
      );
    }

    case "number":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="number"
          required={field.required}
          inputMode={field.inputMode ?? "numeric"}
          min={field.min}
          max={field.max}
          step={field.step}
          dir={field.dir}
        />
      );

    case "email":
      // email type: always LTR; default inputMode="email"
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="email"
          required={field.required}
          maxLength={field.maxLength}
          inputMode="email"
          dir="ltr"
        />
      );

    case "password":
      // password type: always LTR; browser masks value
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="password"
          required={field.required}
          maxLength={field.maxLength}
          dir="ltr"
        />
      );

    default:
      return null;
  }
}
```

### Mobile — renderField

**[PATCH 1] Mobile validation single-source-of-truth**: mobile uses `zodResolver(buildDynamicTemplateSchema(...))` exclusively. All `rules={...}` props have been removed from `renderField`. The zodResolver handles required, min/max, email format, etc. Passing `rules` alongside zodResolver causes conflicts and double-validation.

```jsx
// halla-mobile/components/createEvent/StepThree.js
import TextInput from "../commen/TextInput";
import TextAreaInput from "../commen/TextAreaInput";
import DatePicker from "../commen/DatePicker";
import TimePicker from "../commen/TimePicker";
import ColorPicker from "../commen/colorPicker";
import DropdownInput from "../commen/DropdownInput";
import { Platform } from "react-native";

const INPUT_MODE_TO_KEYBOARD = {
  text:    "default",
  numeric: "numeric",
  decimal: "decimal-pad",
  tel:     "phone-pad",
  email:   "email-address",
  url:     Platform.OS === "ios" ? "url" : "default",
};

function renderField(field, locale) {
  const label = locale === "ar" ? field.labelAr : field.labelEn;
  const placeholder = locale === "ar" ? field.placeholderAr : field.placeholderEn;
  const name = field.key;
  const writingDirection = field.dir === "ltr" ? "ltr"
    : field.dir === "rtl" ? "rtl"
    : "auto";

  switch (field.type) {
    case "text":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "default"}
          autoCapitalize={field.autoCapitalize ?? "sentences"}
          style={{ writingDirection }}
        />
      );

    case "textarea":
      return (
        <TextAreaInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          numberOfLines={field.rows ?? 3}
          maxLength={field.maxLength}
          autoCapitalize={field.autoCapitalize ?? "sentences"}
          style={{ writingDirection }}
        />
      );

    case "date":
      return (
        <DatePicker
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
        />
      );

    case "time":
      return (
        <TimePicker
          key={name}
          name={name}
          label={label}
        />
      );

    case "color":
      return (
        <ColorPicker
          key={name}
          name={name}
          label={label}
          showPresets={true}
        />
      );

    case "font": {
      const fontOptions = fonts.map(f => ({
        label: t(`fonts.${f.id}.displayName`),
        value: f.id,
      }));
      return (
        <DropdownInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          options={fontOptions}
        />
      );
    }

    case "number":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "numeric"}
          style={{ writingDirection }}
        />
      );

    case "email":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ writingDirection: "ltr" }}
        />
      );

    case "password":
      return (
        <TextInput
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          secureTextEntry={true}
          autoCapitalize="none"
          style={{ writingDirection: "ltr" }}
        />
      );

    default:
      return null;
  }
}
```

### Web — StepThree.js, TemplatesCards.js

*(Unchanged from v4)*

### Mobile — EventTemplates.js and StepThree.js

*(Unchanged from v4 except renderField uses the updated function above)*

### Snapshot at Event Creation

*(Updated to call validateTemplateData before buildSnapshot — see A-12)*

---

## Section F — Build Sequence

*(Unchanged from v4)*

1. **Backend: Data models**
   - Add `ADMIN_PAGES.TEMPLATES`, `ADMIN_PAGES.TEMPLATE_CATEGORIES` to `permissions.js`; update `ROLE_PAGE_ACCESS`.
   - Create `labbe-backend-/src/shared/constants/initialTemplateNames.js`
   - Create `labbe-backend-/models/TemplateModel.js` (type enum includes email, password)
   - Create `labbe-backend-/models/TemplateCategoryModel.js`
   - Update `labbe-backend-/models/EventModel.js` — replace `visualTemplateSchema` + `visualTemplateDataSchema`
   - Create `labbe-backend-/src/shared/constants/fontRegistry.js`

2. **Backend: Install dependencies**
   - `npm install sharp @aws-sdk/s3-presigned-post` in `labbe-backend-/`

3. **Backend: Admin templates module**
   - Create `adminTemplates.controller.js` — all CRUD handlers + upload-url + S3 orphan cleanup in try/catch (A-7.1)
   - Create `adminTemplates.routes.js` — with rate limiting on upload-url
   - Create `adminTemplateCategories.controller.js` and routes
   - Register routes in main router

4. **Backend: Public templates module**
   - Create `templates.controller.js` (getTemplates sorted by sortOrder, getCategories)
   - Create `templates.routes.js`
   - Create `fonts.controller.js` and `fonts.routes.js`
   - Register all routes; ensure categories + fonts have no auth

5. **Backend: Template data validator**
   - Create `labbe-backend-/src/modules/events/templateDataValidator.js` (A-12, includes email regex)

6. **Backend: Update events.service.js**
   - Rewrite `updateInvitationSettings` per B-15
   - Add `buildSnapshot()` helper
   - Add `validateTemplateData()` call before snapshot

7. **Backend: Seed and migration scripts**
   - Create `labbe-backend-/seed-assets/templates/` directory (copy 6 JPGs)
   - Create `labbe-backend-/scripts/seedInitialTemplates.js`
   - Update `labbe-backend-/scripts/migrateVisualTemplates.js`
   - Create `labbe-backend-/scripts/gcOrphanTemplateImages.js` (A-7.1)
   - Run once: `node scripts/seedInitialTemplates.js`

8. **Backend verification**
   - `GET /api/templates` returns 6 templates sorted by sortOrder, with all new fields
   - `GET /api/fonts` returns 6 fonts (no displayName)
   - `POST /api/admin/templates/upload-url` returns `{ url, fields, s3Key }` (presigned POST)
   - File > 5MB upload attempt returns S3 400

9. **Web: Shared component**
   - Create `labbe/components/shared/TemplatePreviewCanvas.jsx`
   - Create `labbe/components/shared/OverlayItem.jsx` (sorted by zIndex ASC)
   - Add CloudFront / S3 domain to `next.config.js` `images.remotePatterns`

10. **Web: Extend existing input components**
    - Extend `InputGroup.js` — add `inputMode`, `dir`, `autoCapitalize`, `min`, `max`, `step` props (min/max/step guarded by type=number)
    - Extend `TextArea.js` — add `dir`, `autoCapitalize` props; fix RTL padding

11. **Web: Locale files**
    - Add all keys from Section H-2 to `labbe/localization/locales/en/` and `ar/` namespaces

12. **Web: Host StepThree update**
    - Update `StepThree.js` — category tabs, AbortController, thumbnailUrl
    - Update `TemplatesCards.js` — thumbnailUrl
    - Rewrite `TemplateForm.jsx` — FormProvider, `TemplatePreviewCanvas`, updated `renderField`, B-18/B-19 fixes
    - Update `createEventSchema.js` — `buildDynamicTemplateSchema` with email/password branches
    - Update locale files

13. **Web: Admin templates UI**
    - Install `react-rnd` and `@dnd-kit/sortable` in `labbe/`
    - Create all admin template page components (Section D)
    - Add "Templates" item to admin sidebar config
    - Update `labbe/services/serverAuth.js` to mirror new ADMIN_PAGES

14. **Mobile: Install dependencies**
    - `npm install react-native-view-shot && npx pod-install` in `halla-mobile/`

15. **Mobile: Locale files**
    - Add all keys from Section H-2

16. **Mobile: Shared components + update flow**
    - Create `halla-mobile/components/shared/OverlayItem.js` (sorted by zIndex)
    - Create `halla-mobile/utils/timeFormat.js` (parseTimeString / dateToTimeString)
    - Create `halla-mobile/services/templateService.js`
    - Update `halla-mobile/config/api.js`
    - Update `AdminNavigator.js` — Templates tab
    - Update `EventTemplates.js`, `StepThree.js`, `PreviewInvitation.js`
    - Update `EventsService.js`

17. **Migration**
    - After deploying Step 7: `node scripts/migrateVisualTemplates.js`

18. **Cleanup**
    - Remove old SVG template files
    - Remove hardcoded templates array from `StepThree.js`
    - Remove hardcoded name defaults from mobile `EventsService.js`

---

## Section G — Testing

### Unit Tests

| Test | File | What to assert |
|---|---|---|
| `buildDynamicTemplateSchema` | `__tests__/utils/createEventSchema.test.js` | Required text rejects empty; optional accepts empty; color rejects `#ABCD`; date validates Date; time validates `"HH:MM:AM"` string; number coerces "5" to 5; number rejects below min; number rejects above max; optional number `""` resolves to `undefined` (not 0); **email rejects "not-an-email"**; **email accepts "a@b.com"**; **password accepts any string** |
| `dateToTimeString` / `parseTimeString` (mobile) | `__tests__/utils/timeFormat.test.js` | `dateToTimeString(new Date at 14:30)` → `"2:30:PM"`; `dateToTimeString(new Date at 00:05)` → `"12:05:AM"`; **`dateToTimeString(new Date at 00:00)` → `"12:00:AM"` (midnight edge case)**; **`dateToTimeString(new Date at 12:00)` → `"12:00:PM"` (noon edge case)**; `parseTimeString("12:30:PM")` → Date at 14:30; `parseTimeString("12:00:AM")` → Date at 00:00; `parseTimeString("12:00:PM")` → Date at 12:00; round-trip: `parseTimeString(dateToTimeString(d))` equals `d` at minute resolution |
| Percentage → pixel conversion | `__tests__/utils/overlayPositioning.test.js` | Given `topPct=50, naturalWidth=800, naturalHeight=1000, containerWidth=400`, assert `pixelTop=200`; centering offset is `height/2` |
| `buildDefaultValues` | `__tests__/utils/buildDefaultValues.test.js` | Empty string not coerced to null; saved value takes priority; date resolves to `null` when no saved value; color resolves to `"#c28e5c"`; font resolves to `"cairo"`; email/password default to `""` |
| Color regex | `__tests__/utils/colorRegex.test.js` | Accepts `#FFF`, `#FFFFFF`; rejects `#FFFF`, `#GGGGG` |
| `buildSnapshot` | `__tests__/services/events.service.test.js` | Snapshot contains all fields including `rows`, `inputMode`, `zIndex`; mutation after snapshot does not affect snapshot |
| `validateTemplateData` | `__tests__/modules/events/templateDataValidator.test.js` | Rejects unknown key; rejects required absent; rejects text exceeding maxLength; rejects number below min; rejects invalid hex; **rejects invalid email for type=email**; accepts valid data |
| **email/password renderField** | `__tests__/components/renderField.test.js` | `type="email"` renders `<InputGroup type="email" dir="ltr">`; `type="password"` renders `<InputGroup type="password" dir="ltr">`; mobile `type="email"` renders with `keyboardType="email-address"` and no `rules` prop; mobile `type="password"` renders with `secureTextEntry={true}` and no `rules` prop |
| **rows rendering** | same | Field with `rows: 5` renders `<TextArea rows={5}>` |
| **inputMode rendering (web)** | same | `inputMode: "numeric"` → `<InputGroup inputMode="numeric">` → `<input inputMode="numeric">` |
| **inputMode → keyboardType (mobile)** | `__tests__/components/mobileRenderField.test.js` | `inputMode: "numeric"` → `"numeric"`; `inputMode: "email"` → `"email-address"`; `inputMode: "url"` → `"url"` iOS / `"default"` Android |
| **dir rendering** | `__tests__/components/renderField.test.js` | `dir: "rtl"` → `style={{ direction: "rtl" }}`; `dir: "ltr"` overrides default; `dir: "auto"` → no inline direction style (inherits) |
| **min/max/step guard** | same | `InputGroup type="text"` does not receive `min`/`max`/`step` attributes; `InputGroup type="number"` receives them |
| **Server rejects unknown keys** | `__tests__/services/events.service.test.js` | POST with extra key returns 400 |
| **5 MB enforcement** | `__tests__/upload/presignedPost.test.js` | Presigned POST includes `content-length-range` with max 5MB |
| **Mobile rules-free** | `__tests__/components/mobileRenderField.test.js` | No rendered mobile component in renderField receives a `rules` prop |
| **Locale completeness** | `__tests__/i18n/localeCompleteness.test.js` | All H-2 keys exist in both `en` and `ar` locale files |

### Integration Tests

*(Unchanged from v4)*

### Manual QA Checklist

*(Unchanged from v4, with additions for email/password)*

- [ ] Admin adds a field with `type=email`. Host form shows email input (LTR, keyboard shows email layout on mobile).
- [ ] Admin adds a field with `type=password`. Host form shows masked password input. Canvas preview shows `"••••••••"`.
- [ ] Email field rejects `"not-an-email"` on submit.
- [ ] All other manual QA items from v4 unchanged.

### Verification Grep Checklist

Run these before merging. Every check must return zero matches (or only matches inside existing component internals).

- [ ] `grep -rn "<input " labbe/app/[lang]/admin-dash/templates/ labbe/app/[lang]/host/create-event/_components/templateForm/` — zero matches outside component internals.
- [ ] `grep -rn "<textarea " labbe/app/[lang]/admin-dash/templates/ labbe/app/[lang]/host/create-event/_components/templateForm/` — zero matches.
- [ ] `grep -rn "<select " labbe/app/[lang]/admin-dash/templates/ labbe/app/[lang]/host/create-event/_components/templateForm/` — zero matches.
- [ ] `grep -rn "<button " labbe/app/[lang]/admin-dash/templates/_components/` — zero matches (use `Button` component, not raw `<button>`).
- [ ] `grep -rn "TextInput\b" halla-mobile/components/createEvent/StepThree.js` — only the import line.
- [ ] `grep -rn "useFormContext" labbe/app/[lang]/admin-dash/templates/_components/` — every file calling `useFormContext()` is a descendant of a `FormProvider`.
- [ ] `grep -rn "Controller" labbe/app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx` — zero matches.
- [ ] `grep -rn "rules=" halla-mobile/components/createEvent/StepThree.js` — zero matches (zodResolver is the single validation source).

---

## Section H — Localization

### H-1. Translation Source-of-Truth Rules

*(Unchanged from v4)*

### H-2. Complete Locale Key List

*(Unchanged from v4, with additions below)*

#### H-2a through H-2g

*(All unchanged from v4)*

#### H-2h. Additional keys for email/password types — namespace: `createEvent.json` (web + mobile)

| Key | English value |
|---|---|
| `templates.fields.validation.invalidEmail` | `"Must be a valid email address (e.g. user@example.com)"` |

---

### H-3. Translation Review Checklist (QA)

**[PATCH 12]** Corrected grep test:

- [ ] **Grep test**: `grep -rn '>[A-Z][a-z]\+ ' labbe/app/[lang]/admin-dash/templates/_components/` — flags JSX text nodes starting with a capitalized English word. **Note**: this pattern is imperfect — it catches hardcoded English prose but will also match some valid JSX. Manual review of all matches is required. Legitimate `t(...)` calls inside JSX expressions `{t(...)}` will NOT be flagged by this grep and do not need review.
- [ ] **Arabic UI**: switch web app language to Arabic; navigate to `/ar/admin-dash/templates`. Verify every string renders in Arabic with correct RTL layout.
- [ ] **Admin-provided placeholders are language-bound**: admin enters Arabic placeholder; when host locale is Arabic it shows; when English it still shows the admin-defined Arabic string (not translated).
- [ ] **Font display names**: locale=ar shows Arabic display names; locale=en shows English names.
- [ ] **Error toasts**: trigger each error code and verify toast message is translated.
- [ ] **Locale completeness CI**: `__tests__/i18n/localeCompleteness.test.js` passes (all H-2 + H-2h keys present in both `en` and `ar`).

---

## Blockers — Re-examined

*(Unchanged from v4)*

| # | Question | Status in v4.1 |
|---|---|---|
| 1 | Overlay positions for the 6 JPGs | **Still requires Peter's input.** |
| 2 | CloudFront setup | **Resolved** — S3 virtual-hosted URL fallback when not provisioned. |
| 3 | S3 bucket name and region | **Resolved** — reuse existing env vars from `labbe-backend-/src/utils/s3Upload.js`. |
| 4 | Mobile image generation timing | **Still requires Peter's input.** |
| 5 | Graduation category | **Resolved** — no JPG exists; add later via admin UI. |
| 6 | Moderator delete access | **Still requires Peter's input.** |

---

## Section 8 — Component Reuse Reference (Consolidated)

### 8.7 Forbidden Patterns

1. Creating new generic input components — extend existing components instead.
2. Raw HTML form elements (`<input>`, `<select>`, `<textarea>`, **`<button>`**) in any new admin or StepThree JSX — use catalogued components including `Button.jsx` for action buttons.
3. Wrapping a component in `<Controller>` when it already uses `useFormContext()` internally.
4. Mixing controlled and uncontrolled patterns within the same form.
5. New `useFormContext()` calls without `FormProvider` — `ColorPickerGroup` will throw without it.
6. **[PATCH 1]** Passing `rules={}` props to mobile components alongside `zodResolver` — zodResolver is the single validation source on mobile.

### 8.8 Verification Checklist

See **Section G — Testing → Verification Grep Checklist**.
