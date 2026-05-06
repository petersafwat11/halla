"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import CheckBoxItems from "@/ui/commen/inputs/checkboxItems/CheckBoxItems";
import FieldsSection from "./FieldsSection";
import OverlaysSection from "./OverlaysSection";
import IconPicker, { renderIconByName } from "./IconPicker";
import styles from "./FieldConfigPanel.module.css";

export default function FieldConfigPanel({ categories = [], fonts = [], fieldTypes, lang }) {
  const { t } = useTranslation("admin");
  const { register, control, watch, setValue, formState: { errors } } = useFormContext();
  const decsArr = useFieldArray({ control, name: "decorations" });
  const [iconPickerIdx, setIconPickerIdx] = useState(null);

  const categoryOptions = categories.map((c) => ({
    label: lang === "ar" ? c.nameAr : c.nameEn,
    value: c.code,
  }));

  return (
    <div className={styles.panel}>
      {/* ── 1. Template Identity ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V4C16 2.89543 15.1046 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.sectionTitle}>{t("templates.panel.settings")}</h3>
        </div>

        <div className={styles.formGrid}>
          <InputGroup
            label={t("templates.panel.nameEn")}
            placeholder="Template name in English"
            name="nameEn"
            required
          />
          <InputGroup
            label={t("templates.panel.nameAr")}
            placeholder="اسم القالب بالعربية"
            name="nameAr"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.subsectionLabel}>{t("templates.panel.categories")}</label>
          <CheckBoxItems
            name="categories"
            items={categoryOptions}
            columns={2}
          />
          {errors.categories && (
            <p style={{ color: "var(--error, #e53e3e)", fontSize: "1.2rem", marginTop: "0.4rem" }}>
              {errors.categories.message}
            </p>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <InputGroup
              label={t("templates.panel.sortOrder")}
              placeholder="0"
              name="sortOrder"
              type="number"
            />
          </div>
          <div className={styles.toggleField}>
            <ToggleInput
              name="active"
              label={t("templates.panel.active")}
              description="Enable or disable this template"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Fields ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.sectionTitle}>{t("templates.panel.fields")}</h3>
        </div>
        <FieldsSection fieldTypes={fieldTypes} t={t} />
      </section>

      {/* ── 3. Overlays ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 7H13M7 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.sectionTitle}>{t("templates.panel.overlays")}</h3>
        </div>
        <OverlaysSection fonts={fonts} t={t} />
      </section>

      {/* ── 4. Decorations ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.sectionHeaderActions}>
            <h3 className={styles.sectionTitle}>
              {t("templates.panel.decorations")} ({decsArr.fields.length})
            </h3>
            <Button
              type="button"
              variant="secondary"
              size="small"
              title={t("templates.panel.addDecoration")}
              onClick={() =>
                decsArr.append({
                  type: "icon",
                  source: "Heart",
                  color: "#c28e5c",
                  topPct: 80,
                  leftPct: 50,
                  widthPct: 8,
                  iconSizeVh: 5,
                  zIndex: 0,
                })
              }
            />
          </div>
        </div>

        {decsArr.fields.map((d, idx) => {
          const decType = watch(`decorations.${idx}.type`);
          const decSource = watch(`decorations.${idx}.source`);
          const isIconPickerOpen = iconPickerIdx === idx;

          return (
            <div key={d.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  {decType === "icon" && decSource && (
                    <div className={styles.iconPreview}>
                      {renderIconByName(decSource, { size: 20, strokeWidth: 1.5 })}
                    </div>
                  )}
                  <span className={styles.cardTitle}>Decoration #{idx + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  title={t("templates.panel.delete")}
                  onClick={() => decsArr.remove(idx)}
                />
              </div>

              <div className={styles.formGrid}>
                <InputSelect
                  label={t("templates.panel.decorationType")}
                  name={`decorations.${idx}.type`}
                  placeholder="Select type"
                  options={[
                    { label: "Icon", value: "icon" },
                    { label: "Image", value: "image" },
                  ]}
                />
                {decType === "icon" ? (
                  <div className={styles.iconPickerField}>
                    <label className={styles.inputLabel}>{t("templates.panel.source")}</label>
                    <button
                      type="button"
                      className={styles.iconPickerBtn}
                      onClick={() => setIconPickerIdx(idx)}
                    >
                      {decSource ? (
                        <>
                          <span className={styles.iconPickerIcon}>
                            {renderIconByName(decSource, { size: 20, strokeWidth: 1.5 })}
                          </span>
                          <span className={styles.iconPickerName}>{decSource}</span>
                        </>
                      ) : (
                        <span className={styles.iconPickerPlaceholder}>Choose icon...</span>
                      )}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.chevronDown}>
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <InputGroup
                    label={t("templates.panel.source")}
                    placeholder="e.g. image URL"
                    name={`decorations.${idx}.source`}
                  />
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.subsectionLabel}>{t("templates.panel.color")}</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    {...register(`decorations.${idx}.color`)}
                  />
                  <input
                    type="text"
                    className={styles.colorInput}
                    placeholder="#c28e5c"
                    {...register(`decorations.${idx}.color`)}
                  />
                </div>
              </div>

              {decType === "icon" && (
                <div className={styles.formField}>
                  <InputGroup
                    label="Icon Size (vh %)"
                    placeholder="5"
                    name={`decorations.${idx}.iconSizeVh`}
                    type="number"
                  />
                </div>
              )}

              <div className={styles.formGrid3}>
                <InputGroup
                  label={t("templates.panel.top")}
                  placeholder="%"
                  name={`decorations.${idx}.topPct`}
                  type="number"
                />
                <InputGroup
                  label={t("templates.panel.left")}
                  placeholder="%"
                  name={`decorations.${idx}.leftPct`}
                  type="number"
                />
                <InputGroup
                  label={t("templates.panel.width")}
                  placeholder="%"
                  name={`decorations.${idx}.widthPct`}
                  type="number"
                />
              </div>

              <div className={styles.formField}>
                <InputGroup
                  label={t("templates.panel.zIndex")}
                  placeholder="0"
                  name={`decorations.${idx}.zIndex`}
                  type="number"
                />
              </div>
            </div>
          );
        })}

        {iconPickerIdx !== null && (
          <IconPicker
            value={watch(`decorations.${iconPickerIdx}.source`) || ""}
            onChange={(iconName) => {
              setValue(`decorations.${iconPickerIdx}.source`, iconName);
            }}
            onClose={() => setIconPickerIdx(null)}
          />
        )}

        {decsArr.fields.length === 0 && (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 6L27.5 14.5L36 16L29.5 22L31 31L24 27L17 31L18.5 22L12 16L20.5 14.5L24 6Z" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className={styles.emptyText}>No decorations added yet</p>
            <p className={styles.emptySubtext}>Click "Add Decoration" to get started</p>
          </div>
        )}
      </section>
    </div>
  );
}
