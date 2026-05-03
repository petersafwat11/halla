"use client";
/**
 * FieldConfigPanel — Phase 4c W1-VISUAL
 *
 * Right pane of the admin template editor. Per v4.1 §D component
 * inventory + v4.2 Patch A (categories use `SearchableSelect` wrapped
 * in `<Controller>`).
 *
 * Three sections:
 *   1. Template-level (name EN/AR, categories, sortOrder, active)
 *   2. Fields list (add/remove/edit each field's def)
 *   3. Overlays list (add/remove/edit overlay positions per fieldKey)
 *
 * Pragmatic implementation: percentage inputs for overlay coordinates
 * since react-rnd drag-resize requires the package install. Once
 * `npm install` lands the new deps, an Rnd wrapper around each overlay
 * in TemplatePreviewCanvas can be added without touching this panel.
 */

import React from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";

const STYLE = {
  section: { border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#fff", marginBottom: 12 },
  row: { display: "flex", gap: 8, marginBottom: 8 },
  col: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  label: { fontSize: 12, color: "#555" },
  input: { padding: 6, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 },
  iconBtn: {
    background: "transparent",
    border: "1px solid #ddd",
    borderRadius: 6,
    cursor: "pointer",
    padding: "4px 8px",
  },
};

export default function FieldConfigPanel({ categories = [], fonts = [], fieldTypes, lang }) {
  const { register, control, watch, setValue } = useFormContext();
  const fieldsArr = useFieldArray({ control, name: "fields" });
  const overlaysArr = useFieldArray({ control, name: "overlays" });
  const decsArr = useFieldArray({ control, name: "decorations" });

  const fields = watch("fields") || [];
  const overlays = watch("overlays") || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
      {/* ── 1. Template-level config ────────────────────────────── */}
      <section style={STYLE.section}>
        <h3 style={{ marginBottom: 8 }}>إعدادات القالب</h3>
        <div style={STYLE.row}>
          <div style={STYLE.col}>
            <label style={STYLE.label}>الاسم (إنجليزي)</label>
            <input style={STYLE.input} {...register("nameEn", { required: true })} />
          </div>
          <div style={STYLE.col}>
            <label style={STYLE.label}>الاسم (عربي)</label>
            <input style={STYLE.input} dir="rtl" {...register("nameAr", { required: true })} />
          </div>
        </div>
        <div style={STYLE.row}>
          <div style={STYLE.col}>
            <label style={STYLE.label}>الفئات</label>
            {/* v4.2 Patch A: multi-select via Controller. Categories list
                comes from the admin categories endpoint. */}
            <Controller
              name="categories"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <select
                  multiple
                  size={Math.min(6, Math.max(3, categories.length))}
                  style={STYLE.input}
                  value={field.value || []}
                  onChange={(e) =>
                    field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                >
                  {categories.map((c) => (
                    <option key={c._id || c.code} value={c.code}>
                      {lang === "ar" ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
        <div style={STYLE.row}>
          <div style={STYLE.col}>
            <label style={STYLE.label}>ترتيب الفرز</label>
            <input type="number" min={0} style={STYLE.input} {...register("sortOrder", { valueAsNumber: true })} />
          </div>
          <div style={STYLE.col}>
            <label style={{ ...STYLE.label, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" {...register("active")} />
              نشط
            </label>
          </div>
        </div>
      </section>

      {/* ── 2. Fields ──────────────────────────────────────────── */}
      <section style={STYLE.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>الحقول ({fields.length})</h3>
          <button
            type="button"
            style={STYLE.iconBtn}
            onClick={() =>
              fieldsArr.append({
                key: `field_${fields.length + 1}`,
                type: "text",
                labelEn: "New field",
                labelAr: "حقل جديد",
                required: false,
              })
            }
          >
            + إضافة حقل
          </button>
        </div>
        {fieldsArr.fields.map((f, idx) => {
          const type = watch(`fields.${idx}.type`);
          return (
            <div key={f.id} style={{ ...STYLE.section, marginTop: 8, background: "#fafafa" }}>
              <div style={STYLE.row}>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>المفتاح</label>
                  <input style={STYLE.input} {...register(`fields.${idx}.key`, { required: true })} />
                </div>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>النوع</label>
                  <select style={STYLE.input} {...register(`fields.${idx}.type`)}>
                    {fieldTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button type="button" style={{ ...STYLE.iconBtn, color: "#d33" }} onClick={() => fieldsArr.remove(idx)}>
                  حذف
                </button>
              </div>
              <div style={STYLE.row}>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>اسم الحقل (EN)</label>
                  <input style={STYLE.input} {...register(`fields.${idx}.labelEn`, { required: true })} />
                </div>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>اسم الحقل (AR)</label>
                  <input dir="rtl" style={STYLE.input} {...register(`fields.${idx}.labelAr`, { required: true })} />
                </div>
              </div>
              <div style={STYLE.row}>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>placeholder (EN)</label>
                  <input style={STYLE.input} {...register(`fields.${idx}.placeholderEn`)} />
                </div>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>placeholder (AR)</label>
                  <input dir="rtl" style={STYLE.input} {...register(`fields.${idx}.placeholderAr`)} />
                </div>
              </div>
              <div style={STYLE.row}>
                <label style={{ ...STYLE.label, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" {...register(`fields.${idx}.required`)} />
                  مطلوب
                </label>
                {(type === "text" || type === "textarea" || type === "email" || type === "password") && (
                  <>
                    <div style={STYLE.col}>
                      <label style={STYLE.label}>min len</label>
                      <input type="number" style={STYLE.input} {...register(`fields.${idx}.minLength`, { valueAsNumber: true })} />
                    </div>
                    <div style={STYLE.col}>
                      <label style={STYLE.label}>max len</label>
                      <input type="number" style={STYLE.input} {...register(`fields.${idx}.maxLength`, { valueAsNumber: true })} />
                    </div>
                  </>
                )}
                {type === "number" && (
                  <>
                    <div style={STYLE.col}>
                      <label style={STYLE.label}>min</label>
                      <input type="number" style={STYLE.input} {...register(`fields.${idx}.min`, { valueAsNumber: true })} />
                    </div>
                    <div style={STYLE.col}>
                      <label style={STYLE.label}>max</label>
                      <input type="number" style={STYLE.input} {...register(`fields.${idx}.max`, { valueAsNumber: true })} />
                    </div>
                    <div style={STYLE.col}>
                      <label style={STYLE.label}>step</label>
                      <input type="number" style={STYLE.input} {...register(`fields.${idx}.step`, { valueAsNumber: true })} />
                    </div>
                  </>
                )}
                {type === "textarea" && (
                  <div style={STYLE.col}>
                    <label style={STYLE.label}>rows</label>
                    <input type="number" min={1} style={STYLE.input} {...register(`fields.${idx}.rows`, { valueAsNumber: true })} />
                  </div>
                )}
              </div>
              <div style={STYLE.row}>
                <div style={STYLE.col}>
                  <label style={STYLE.label}>defaultValue</label>
                  <input style={STYLE.input} {...register(`fields.${idx}.defaultValue`)} />
                </div>
                {type !== "email" && type !== "password" && (
                  <div style={STYLE.col}>
                    <label style={STYLE.label}>dir</label>
                    <select style={STYLE.input} {...register(`fields.${idx}.dir`)}>
                      <option value="auto">auto</option>
                      <option value="ltr">ltr</option>
                      <option value="rtl">rtl</option>
                    </select>
                  </div>
                )}
                {(type === "text" || type === "number" || type === "email") && (
                  <div style={STYLE.col}>
                    <label style={STYLE.label}>inputMode</label>
                    <select style={STYLE.input} {...register(`fields.${idx}.inputMode`)}>
                      <option value="">—</option>
                      <option value="text">text</option>
                      <option value="numeric">numeric</option>
                      <option value="decimal">decimal</option>
                      <option value="tel">tel</option>
                      <option value="email">email</option>
                      <option value="url">url</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 3. Overlays ────────────────────────────────────────── */}
      <section style={STYLE.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>المواقع ({overlays.length})</h3>
          <button
            type="button"
            style={STYLE.iconBtn}
            onClick={() =>
              overlaysArr.append({
                fieldKey: fields[0]?.key || "",
                topPct: 50,
                leftPct: 50,
                widthPct: 60,
                heightPct: 10,
                fontSizeVh: 4,
                textAlign: "center",
                colorBinding: "primary",
                zIndex: 0,
              })
            }
          >
            + إضافة موقع
          </button>
        </div>
        {overlaysArr.fields.map((o, idx) => (
          <div key={o.id} style={{ ...STYLE.section, background: "#fafafa", marginTop: 8 }}>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>fieldKey</label>
                <select style={STYLE.input} {...register(`overlays.${idx}.fieldKey`)}>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>{f.labelEn || f.key}</option>
                  ))}
                </select>
              </div>
              <button type="button" style={{ ...STYLE.iconBtn, color: "#d33" }} onClick={() => overlaysArr.remove(idx)}>
                حذف
              </button>
            </div>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>top%</label>
                <input type="number" min={0} max={100} step={0.5} style={STYLE.input}
                  {...register(`overlays.${idx}.topPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>left%</label>
                <input type="number" min={0} max={100} step={0.5} style={STYLE.input}
                  {...register(`overlays.${idx}.leftPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>width%</label>
                <input type="number" min={0} max={100} step={0.5} style={STYLE.input}
                  {...register(`overlays.${idx}.widthPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>height%</label>
                <input type="number" min={0} max={100} step={0.5} style={STYLE.input}
                  {...register(`overlays.${idx}.heightPct`, { valueAsNumber: true })} />
              </div>
            </div>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>font%</label>
                <input type="number" min={0} step={0.5} style={STYLE.input}
                  {...register(`overlays.${idx}.fontSizeVh`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>fontFamily</label>
                <select style={STYLE.input} {...register(`overlays.${idx}.fontFamily`)}>
                  <option value="">— inherit</option>
                  {fonts.map((f) => (
                    <option key={f.id} value={f.webFamily || f.id}>{f.id}</option>
                  ))}
                </select>
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>fontWeight</label>
                <select style={STYLE.input} {...register(`overlays.${idx}.fontWeight`)}>
                  {["normal", "bold", "400", "500", "600", "700"].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>textAlign</label>
                <select style={STYLE.input} {...register(`overlays.${idx}.textAlign`)}>
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </div>
            </div>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>colorBinding</label>
                <select style={STYLE.input} {...register(`overlays.${idx}.colorBinding`)}>
                  <option value="primary">primary</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>color (custom only)</label>
                <input type="color" style={STYLE.input} {...register(`overlays.${idx}.color`)} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>zIndex</label>
                <input type="number" style={STYLE.input}
                  {...register(`overlays.${idx}.zIndex`, { valueAsNumber: true })} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── 4. Decorations ─────────────────────────────────────── */}
      <section style={STYLE.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>الزخارف ({decsArr.fields.length})</h3>
          <button
            type="button"
            style={STYLE.iconBtn}
            onClick={() =>
              decsArr.append({
                type: "icon",
                source: "Heart",
                color: "#c28e5c",
                topPct: 80,
                leftPct: 50,
                widthPct: 8,
                heightPct: 8,
                zIndex: 0,
              })
            }
          >
            + إضافة زخرفة
          </button>
        </div>
        {decsArr.fields.map((d, idx) => (
          <div key={d.id} style={{ ...STYLE.section, background: "#fafafa", marginTop: 8 }}>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>type</label>
                <select style={STYLE.input} {...register(`decorations.${idx}.type`)}>
                  <option value="icon">icon</option>
                  <option value="image">image</option>
                </select>
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>source</label>
                <input style={STYLE.input} {...register(`decorations.${idx}.source`)} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>color</label>
                <input type="color" style={STYLE.input} {...register(`decorations.${idx}.color`)} />
              </div>
              <button type="button" style={{ ...STYLE.iconBtn, color: "#d33" }} onClick={() => decsArr.remove(idx)}>
                حذف
              </button>
            </div>
            <div style={STYLE.row}>
              <div style={STYLE.col}>
                <label style={STYLE.label}>top%</label>
                <input type="number" style={STYLE.input}
                  {...register(`decorations.${idx}.topPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>left%</label>
                <input type="number" style={STYLE.input}
                  {...register(`decorations.${idx}.leftPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>width%</label>
                <input type="number" style={STYLE.input}
                  {...register(`decorations.${idx}.widthPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>height%</label>
                <input type="number" style={STYLE.input}
                  {...register(`decorations.${idx}.heightPct`, { valueAsNumber: true })} />
              </div>
              <div style={STYLE.col}>
                <label style={STYLE.label}>z</label>
                <input type="number" style={STYLE.input}
                  {...register(`decorations.${idx}.zIndex`, { valueAsNumber: true })} />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
