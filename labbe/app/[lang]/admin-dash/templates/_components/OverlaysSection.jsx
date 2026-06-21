"use client";
import React, { useState } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import styles from "./OverlaysSection.module.css";

const TEXT_ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const COLOR_BINDING_OPTIONS = [
  { label: "Primary Theme", value: "primary" },
  { label: "Custom Color", value: "custom" },
];

const FONT_WEIGHT_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Medium", value: "500" },
  { label: "Semi Bold", value: "600" },
  { label: "Bold", value: "bold" },
  { label: "Extra Bold", value: "700" },
];

export default function OverlaysSection({ fonts, t }) {
  const { register, control, watch } = useFormContext();
  const overlaysArr = useFieldArray({ control, name: "overlays" });
  const fields = watch("fields") || [];
  const [expandedOverlay, setExpandedOverlay] = useState(null);

  const fontOptions = fonts.map((f) => ({
    label: f.webFamily || f.id,
    value: f.webFamily || f.id,
  }));

  const fieldKeyOptions = fields.map((f) => ({
    label: f.labelEn || f.key,
    value: f.key,
  }));

  return (
    <div className={styles.overlaysContainer}>
      <div className={styles.overlaysHeader}>
        <span className={styles.overlayCount}>{overlaysArr.fields.length} overlay{overlaysArr.fields.length !== 1 ? "s" : ""}</span>
        <Button
          type="button"
          variant="primary"
          size="small"
          title={`+ ${t("templates.panel.addOverlay")}`}
          onClick={() => {
            const idx = overlaysArr.fields.length;
            overlaysArr.append({
              fieldKey: fields[0]?.key || "",
              topPct: 50,
              leftPct: 50,
              widthPct: 60,
              fontSizeVh: 4,
              lineHeight: 1.35,
              maxLines: 1,
              textAlign: "center",
              colorBinding: "primary",
              zIndex: 0,
            });
            setExpandedOverlay(idx);
          }}
        />
      </div>

      {overlaysArr.fields.map((o, idx) => {
        const isExpanded = expandedOverlay === idx;
        const colorBinding = watch(`overlays.${idx}.colorBinding`);

        return (
          <div key={o.id} className={`${styles.overlayCard} ${isExpanded ? styles.expanded : ""}`}>
            <div
              className={styles.overlayCardHeader}
              onClick={() => setExpandedOverlay(isExpanded ? null : idx)}
            >
              <div className={styles.overlayCardHeaderLeft}>
                <span className={styles.overlayIndex}>{idx + 1}</span>
                <div className={styles.overlayCardInfo}>
                  <span className={styles.overlayCardField}>
                    {watch(`overlays.${idx}.fieldKey`) || "No field selected"}
                  </span>
                  <span className={styles.overlayCardPosition}>
                    {Math.round(watch(`overlays.${idx}.topPct`) || 0)}% / {Math.round(watch(`overlays.${idx}.leftPct`) || 0)}%
                  </span>
                </div>
              </div>
              <div className={styles.overlayCardHeaderRight}>
                <svg
                  className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  title={t("templates.panel.delete")}
                  onClick={(e) => {
                    e.stopPropagation();
                    overlaysArr.remove(idx);
                    if (expandedOverlay === idx) setExpandedOverlay(null);
                  }}
                />
              </div>
            </div>

            {isExpanded && (
              <div className={styles.overlayCardBody}>
                {/* Field Binding */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Field Binding</h4>
                  <InputSelect
                    label={t("templates.panel.fieldKey")}
                    name={`overlays.${idx}.fieldKey`}
                    placeholder="Select field"
                    options={fieldKeyOptions}
                  />
                </div>

                {/* Position */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Position & Size</h4>
                  <div className={styles.formGrid3}>
                    <InputGroup
                      label={t("templates.panel.top")}
                      placeholder="%"
                      name={`overlays.${idx}.topPct`}
                      type="number"
                    />
                    <InputGroup
                      label={t("templates.panel.left")}
                      placeholder="%"
                      name={`overlays.${idx}.leftPct`}
                      type="number"
                    />
                    <InputGroup
                      label={t("templates.panel.width")}
                      placeholder="%"
                      name={`overlays.${idx}.widthPct`}
                      type="number"
                    />
                  </div>
                </div>

                {/* Typography */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Typography</h4>
                  <div className={styles.formGrid2}>
                    <InputGroup
                      label={t("templates.panel.fontSize")}
                      placeholder="vh"
                      name={`overlays.${idx}.fontSizeVh`}
                      type="number"
                    />
                    <InputSelect
                      label={t("templates.panel.textAlign")}
                      name={`overlays.${idx}.textAlign`}
                      placeholder="Center"
                      options={TEXT_ALIGN_OPTIONS}
                    />
                  </div>
                  <div className={styles.formGrid2}>
                    <InputGroup
                      label="Line Height"
                      placeholder="1.35"
                      name={`overlays.${idx}.lineHeight`}
                      type="number"
                    />
                    <InputGroup
                      label="Maximum Lines"
                      placeholder="1"
                      name={`overlays.${idx}.maxLines`}
                      type="number"
                    />
                  </div>
                  {fontOptions.length > 0 && (
                    <div className={styles.formGrid2}>
                      <InputSelect
                        label={t("templates.panel.fontFamily")}
                        name={`overlays.${idx}.fontFamily`}
                        placeholder={t("templates.panel.inherit")}
                        options={[{ label: "Inherit", value: "" }, ...fontOptions]}
                      />
                      <InputSelect
                        label={t("templates.panel.fontWeight")}
                        name={`overlays.${idx}.fontWeight`}
                        placeholder="Normal"
                        options={FONT_WEIGHT_OPTIONS}
                      />
                    </div>
                  )}
                </div>

                {/* Color */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Color</h4>
                  <div className={styles.formGrid2}>
                    <InputSelect
                      label={t("templates.panel.colorBinding")}
                      name={`overlays.${idx}.colorBinding`}
                      placeholder="Primary"
                      options={COLOR_BINDING_OPTIONS}
                    />
                    {colorBinding === "custom" && (
                      <div className={styles.colorPickerWrapper}>
                        <label className={styles.colorLabel}>{t("templates.panel.customColor")}</label>
                        <div className={styles.colorInputs}>
                          <input
                            type="color"
                            className={styles.colorPicker}
                            {...register(`overlays.${idx}.color`)}
                          />
                          <input
                            type="text"
                            className={styles.colorInput}
                            placeholder="#c28e5c"
                            {...register(`overlays.${idx}.color`)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Z-Index */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Layer</h4>
                  <div className={styles.formField}>
                    <InputGroup
                      label={t("templates.panel.zIndex")}
                      placeholder="0"
                      name={`overlays.${idx}.zIndex`}
                      type="number"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {overlaysArr.fields.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="10" y="14" width="28" height="20" rx="3" stroke="#c28e5c" strokeWidth="2"/>
            <path d="M18 24H30M24 18V30" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className={styles.emptyText}>No overlays added yet</p>
          <p className={styles.emptySubtext}>Click "Add Overlay" to position text on your template</p>
        </div>
      )}
    </div>
  );
}
