import { z } from "zod";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Coerce empty/null/undefined → undefined; cast string → number otherwise */
const toOptNum = (v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

/** Coerce empty/null/undefined → undefined; keep non-empty strings */
const toOptStr = (v) =>
  v === "" || v === null || v === undefined ? undefined : String(v);

const optStr  = z.preprocess(toOptStr, z.string().optional());
const optNum  = z.preprocess(toOptNum, z.number().optional());

/** Required percentage 0–100 (tolerates string input from HTML number inputs) */
const reqPct = z.preprocess(
  toOptNum,
  z.number({ required_error: "Required" }).min(0, "Min 0").max(100, "Max 100")
);

const optPct = z.preprocess(toOptNum, z.number().min(0).max(100).optional());

// ── field definition ──────────────────────────────────────────────────────────

export const fieldDefSchema = z.object({
  key:          z.string().min(1, "Key is required"),
  type:         z.enum(
                  ["text","textarea","date","time","color","font","number","email","password"],
                  { required_error: "Type is required" }
                ),
  labelEn:      z.string().min(1, "English label is required"),
  labelAr:      z.string().min(1, "Arabic label is required"),
  placeholderEn: optStr,
  placeholderAr: optStr,
  required:     z.boolean().default(false),
  minLength:    optNum,
  maxLength:    optNum,
  defaultValue: z.any().optional(),
  rows:         optNum,
  // inputMode / dir are optional enums — "" (unselected) must become undefined
  // so Mongoose doesn't receive an empty string and reject it
  inputMode: z.preprocess(
    toOptStr,
    z.enum(["text","numeric","decimal","tel","email","url"]).optional()
  ),
  dir: z.preprocess(
    toOptStr,
    z.enum(["auto","ltr","rtl"]).optional()
  ),
  autoCapitalize: z.preprocess(
    toOptStr,
    z.enum(["none","sentences","words","characters"]).optional()
  ),
  min:  optNum,
  max:  optNum,
  step: optNum,
});

// ── overlay ───────────────────────────────────────────────────────────────────

export const overlaySchema = z.object({
  fieldKey:     z.string().min(1, "Field key is required"),
  topPct:       reqPct,
  leftPct:      reqPct,
  widthPct:     optPct,
  fontSizeVh:   z.preprocess(toOptNum, z.number().min(0).optional()),
  fontWeight: z.preprocess(
    toOptStr,
    z.enum(["normal","bold","100","200","300","400","500","600","700","800","900"]).optional()
  ),
  textAlign: z.preprocess(
    toOptStr,
    z.enum(["left","center","right"]).optional()
  ),
  colorBinding: z.preprocess(
    toOptStr,
    z.enum(["primary","custom"]).optional()
  ),
  color:      optStr,
  fontFamily: optStr,
  zIndex:     optNum,
});

// ── decoration ────────────────────────────────────────────────────────────────

export const decorationSchema = z.object({
  type:       z.enum(["icon","image"], { required_error: "Type is required" }),
  source:     z.string().min(1, "Source is required"),
  color:      optStr,
  topPct:     reqPct,
  leftPct:    reqPct,
  widthPct:   reqPct,
  iconSizeVh: z.preprocess(toOptNum, z.number().min(0).optional()),
  zIndex:     optNum,
});

// ── root template form ────────────────────────────────────────────────────────

export const templateSchema = z.object({
  nameEn:      z.string().min(1, "English name is required"),
  nameAr:      z.string().min(1, "Arabic name is required"),
  categories:  z.array(z.string()).min(1, "At least one category is required"),
  // imageUrl / s3Key are handled manually in onSubmit; don't fail form validation
  imageUrl:    z.string().optional(),
  s3Key:       z.string().optional(),
  imageS3Key:  z.string().optional(),
  naturalWidth:  z.preprocess(toOptNum, z.number().optional()),
  naturalHeight: z.preprocess(toOptNum, z.number().optional()),
  fields:      z.array(fieldDefSchema),
  overlays:    z.array(overlaySchema),
  decorations: z.array(decorationSchema),
  sortOrder:   z.preprocess(toOptNum, z.number().default(0)),
  active:      z.boolean().default(true),
});
