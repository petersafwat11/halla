const { z } = require("zod");

const FIELD_TYPES = [
  "text",
  "textarea",
  "date",
  "time",
  "color",
  "font",
  "number",
  "email",
  "password",
];

const INPUT_MODES = ["text", "numeric", "decimal", "tel", "email", "url"];
const AUTO_CAPS = ["none", "sentences", "words", "characters"];
const DIRS = ["auto", "ltr", "rtl"];
const FONT_WEIGHTS = [
  "normal",
  "bold",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];
const TEXT_ALIGNS = ["left", "center", "right"];
const COLOR_BINDINGS = ["primary", "custom"];
const DECORATION_TYPES = ["icon", "image"];

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "color must be a valid hex string");

const fieldDefSchema = z
  .object({
    key: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    labelEn: z.string().min(1),
    labelAr: z.string().min(1),
    placeholderEn: z.string().optional(),
    placeholderAr: z.string().optional(),
    required: z.boolean().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    defaultValue: z.unknown().optional(),
    rows: z.number().int().positive().optional(),
    inputMode: z.enum(INPUT_MODES).optional(),
    autoCapitalize: z.enum(AUTO_CAPS).optional(),
    dir: z.enum(DIRS).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .strict();

const overlaySchema = z
  .object({
    fieldKey: z.string().min(1),
    topPct: z.number().min(0).max(100),
    leftPct: z.number().min(0).max(100),
    widthPct: z.number().min(0).max(100).optional(),
    fontSizeVh: z.number().nonnegative().optional(),
    fontWeight: z.enum(FONT_WEIGHTS).optional(),
    textAlign: z.enum(TEXT_ALIGNS).optional(),
    colorBinding: z.enum(COLOR_BINDINGS).optional(),
    color: hexColor.optional(),
    fontFamily: z.string().optional(),
    zIndex: z.number().int().optional(),
  })
  .strict();

const decorationSchema = z
  .object({
    type: z.enum(DECORATION_TYPES),
    source: z.string().min(1),
    color: z.string().optional(),
    topPct: z.number().min(0).max(100),
    leftPct: z.number().min(0).max(100),
    widthPct: z.number().min(0).max(100),
    iconSizeVh: z.number().nonnegative().optional(),
    zIndex: z.number().int().optional(),
  })
  .strict();

const createTemplateSchema = z
  .object({
    nameEn: z.string().min(1),
    nameAr: z.string().min(1),
    categories: z.array(z.string().min(1)).min(1, "At least one category is required"),
    s3Key: z.string().min(1, "s3Key is required (call /upload-image first)"),
    naturalWidth: z.number().positive(),
    naturalHeight: z.number().positive(),
    fields: z.array(fieldDefSchema).optional(),
    overlays: z.array(overlaySchema).optional(),
    decorations: z.array(decorationSchema).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const updateTemplateSchema = z
  .object({
    nameEn: z.string().min(1).optional(),
    nameAr: z.string().min(1).optional(),
    categories: z.array(z.string().min(1)).min(1).optional(),
    s3Key: z.string().min(1).optional(),
    naturalWidth: z.number().positive().optional(),
    naturalHeight: z.number().positive().optional(),
    fields: z.array(fieldDefSchema).optional(),
    overlays: z.array(overlaySchema).optional(),
    decorations: z.array(decorationSchema).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict();

const createCategorySchema = z
  .object({
    code: z
      .string()
      .min(1)
      .regex(/^[a-z0-9_]+$/, "code must be snake_case lowercase letters/digits/underscores"),
    nameEn: z.string().min(1),
    nameAr: z.string().min(1),
    sortOrder: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    nameEn: z.string().min(1).optional(),
    nameAr: z.string().min(1).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const hostListQuerySchema = z.object({
  category: z.string().min(1).optional(),
});

const adminListQuerySchema = z.object({
  category: z.string().min(1).optional(),
  search: z.string().optional(),
  includeInactive: z.enum(["true", "false"]).optional(),
  includeDeleted: z.enum(["true", "false"]).optional(),
});

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
  createCategorySchema,
  updateCategorySchema,
  hostListQuerySchema,
  adminListQuerySchema,
};
