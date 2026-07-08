"use client";

import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import IconPicker, { renderIconByName } from "./IconPicker";
import styles from "./FieldConfigPanel.module.css";

export default function TemplateDecorationsSection() {
  const { t } = useTranslation("admin");
  const { register, control, watch, setValue } = useFormContext();
  const decsArr = useFieldArray({ control, name: "decorations" });
  const [iconPickerIdx, setIconPickerIdx] = useState(null);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

        return (
          <div key={d.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                {decType === "icon" && decSource && (
                  <div className={styles.iconPreview}>
                    {renderIconByName(decSource, { size: 20, strokeWidth: 1.5 })}
                  </div>
                )}
                <span className={styles.cardTitle}>
                  {t("templates.panel.decorationNumber", "Decoration #{{number}}", {
                    number: idx + 1,
                  })}
                </span>
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
                placeholder={t("templates.panel.selectType", "Select type")}
                options={[
                  { label: t("templates.panel.icon", "Icon"), value: "icon" },
                  { label: t("templates.panel.image", "Image"), value: "image" },
                ]}
              />
              {decType === "icon" ? (
                <div className={styles.iconPickerField}>
                  <label className={styles.inputLabel}>
                    {t("templates.panel.source")}
                  </label>
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
                      <span className={styles.iconPickerPlaceholder}>
                        {t("templates.panel.chooseIcon", "Choose icon...")}
                      </span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.chevronDown}>
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <InputGroup
                  label={t("templates.panel.source")}
                  placeholder={t("templates.panel.imageUrlPlaceholder", "e.g. image URL")}
                  name={`decorations.${idx}.source`}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.subsectionLabel}>
                {t("templates.panel.color")}
              </label>
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
                  label={t("templates.panel.iconSizeVh", "Icon Size (vh %)")}
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
            <path d="M24 6L27.5 14.5L36 16L29.5 22L31 31L24 27L17 31L18.5 22L12 16L20.5 14.5L24 6Z" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className={styles.emptyText}>
            {t("templates.panel.noDecorations", "No decorations added yet")}
          </p>
          <p className={styles.emptySubtext}>
            {t("templates.panel.addDecorationHint", 'Click "Add Decoration" to get started')}
          </p>
        </div>
      )}
    </section>
  );
}
