"use client";
import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import styles from "./stepTwo.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import CategorySelect from "@/ui/commen/inputs/CategorySelect/CategorySelect";
import ActionButtons from "./actionButtons/ActionButtons";
import { exportToXLSX, importFromXLSX } from "@/utils/xlsxUtils";

const GuestImporter = ({
  guestList,
  setValue,
  isLimitReached,
  isUnlimited,
  guestLimit,
  currentItem,
  setCurrentItem,
  resetCurrentItem,
  setImportErrors,
  setImportLimitInfo,
  setShowImportLimitPopup,
  categories = [],
}) => {
  const { t } = useTranslation("createEvent");
  const fileInputRef = useRef(null);
  const [localErrors, setLocalErrors] = useState({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [, setIsImporting] = useState(false);

  const handleInputChange = useCallback(
    (field, value) => {
      setCurrentItem((prev) => ({ ...prev, [field]: value }));
      setLocalErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      setShowValidationErrors(false);
    },
    [setCurrentItem]
  );

  const validateItem = useCallback(() => {
    const newErrors = {};
    const name = (currentItem.name || "").trim();
    const mobile = (currentItem.mobile || "").trim();
    if (!name) newErrors.name = t("validation.guest_name_required");
    if (!mobile) {
      newErrors.mobile = t("validation.mobile_required");
    } else if (!/^5[0-9]{8}$/.test(mobile)) {
      newErrors.mobile = t("validation.mobile_format");
    }
    if (mobile && !currentItem.id) {
      const mobileExists = guestList.some((item) => item.mobile === mobile);
      if (mobileExists) newErrors.mobile = t("validation.mobile_duplicate");
    }
    setLocalErrors(newErrors);
    setShowValidationErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [currentItem, guestList, t]);

  const resetLocal = useCallback(() => {
    setLocalErrors({});
    setShowValidationErrors(false);
    resetCurrentItem();
  }, [resetCurrentItem]);

  const handleAdd = () => {
    if (isLimitReached) return;
    if (!validateItem()) return;
    try {
      const newItem = {
        name: currentItem.name?.trim() || "",
        mobile: currentItem.mobile?.trim() || "",
        category: currentItem.category?.trim() || "",
        // `Date.now()` alone collides if the user double-taps Add on a
        // slow mobile (two adds in the same millisecond → same id →
        // React row key collision). Matches transformGuestList's
        // fallback shape in useEventForm.js.
        id: Date.now() + Math.random(),
      };
      setValue("guestList", [...guestList, newItem], { shouldValidate: true });
      resetLocal();
    } catch (error) {
      console.error("Error adding guest:", error);
    }
  };

  const handleEdit = (id) => {
    if (!validateItem()) return;
    try {
      const updatedItem = {
        name: currentItem.name?.trim() || "",
        mobile: currentItem.mobile?.trim() || "",
        category: currentItem.category?.trim() || "",
        id,
      };
      const updatedList = guestList.map((item) =>
        item.id === id ? updatedItem : item
      );
      setValue("guestList", updatedList, { shouldValidate: true });
      resetLocal();
    } catch (error) {
      console.error("Error editing guest:", error);
    }
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      { key: "name", label: t("excel_guest_name") },
      { key: "mobile", label: t("excel_phone_number") },
      { key: "category", label: t("excel_category") },
    ];
    const sampleData = [
      { name: t("excel_sample_name"), mobile: "512345678", category: t("excel_sample_category") },
    ];
    const fileName = t("excel_template_filename");
    const result = exportToXLSX(headers, sampleData, fileName, true);
    if (!result.success) console.error("Error downloading template");
  }, [t]);

  const handleImportCSV = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (isLimitReached) {
        setImportLimitInfo({ inserted: 0, skipped: 0 });
        setShowImportLimitPopup(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setIsImporting(true);
      setImportErrors([]);
      try {
        const headers = [
          { key: "name", label: t("excel_guest_name") },
          { key: "mobile", label: t("excel_phone_number") },
          // Optional column — present in the downloaded template, but the
          // importer accepts files without it.
          { key: "category", label: t("excel_category"), optional: true },
        ];
        const validateRow = (row) => {
          const errors = [];
          if (!row.name || !row.name.trim()) errors.push(t("validation.name_required"));
          if (!row.mobile || !row.mobile.trim()) {
            errors.push(t("validation.mobile_required"));
          } else if (!/^5[0-9]{8}$/.test(row.mobile)) {
            errors.push(t("validation.mobile_format_import"));
          }
          // category is optional and free-text — no validation.
          return { isValid: errors.length === 0, errors };
        };
        const result = await importFromXLSX(file, headers, validateRow);
        if (result.success) {
          const existingMobiles = guestList.map((item) => item.mobile);
          const duplicates = [];
          const validData = result.data
            .filter((item, index) => {
              if (existingMobiles.includes(item.mobile)) {
                duplicates.push({
                  row: index + 2,
                  errors: [t("validation.mobile_duplicate_import")],
                });
                return false;
              }
              existingMobiles.push(item.mobile);
              return true;
            })
            // Normalize to the form-guest shape (with an id + category) so
            // imported rows are editable/removable like manually-added ones.
            .map((item) => ({
              name: (item.name || "").trim(),
              mobile: (item.mobile || "").trim(),
              category: (item.category || "").trim(),
              id: `${Date.now()}_${Math.random()}`,
            }));
          // Limit to remaining guest quota
          const currentRemaining = isUnlimited
            ? Infinity
            : Math.max(0, guestLimit - guestList.length);
          const guestsToInsert = validData.slice(0, currentRemaining);
          const guestsSkipped = validData.length - guestsToInsert.length;
          if (guestsToInsert.length > 0) {
            setValue("guestList", [...guestList, ...guestsToInsert], {
              shouldValidate: true,
            });
          }
          if (guestsSkipped > 0) {
            setImportLimitInfo({
              inserted: guestsToInsert.length,
              skipped: guestsSkipped,
            });
            setShowImportLimitPopup(true);
          }
          const allErrors = [...result.errors, ...duplicates];
          if (allErrors.length > 0) setImportErrors(allErrors);
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportErrors([{ row: 0, errors: [error.message] }]);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [guestList, setValue, isLimitReached, isUnlimited, guestLimit, t, setImportErrors, setImportLimitInfo, setShowImportLimitPopup]
  );

  const isEditing = currentItem.id !== undefined;

  // Datalist options: the host's saved category labels merged with any
  // already present on the current guest list.
  const categoryOptions = Array.from(
    new Set([
      ...(categories || []),
      ...guestList.map((g) => g.category).filter(Boolean),
    ])
  );

  return (
    <>
      {/* Manual Add Section */}
      <div
        className={`${styles.addManualSection} ${isLimitReached ? styles.disabled : ""
          }`}
      >
        <h3 className={styles.sectionTitle}>
          {t("add_manually")}
        </h3>

        <div className={styles.formGrid}>
          <InputGroup
            label={t("guest_name")}
            placeholder={t("guest_name_placeholder")}
            required
            value={currentItem.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            error={showValidationErrors ? localErrors.name : ""}
            disabled={isLimitReached && !currentItem.id}
          />
          <MobileInputGroup
            label={t("phone_number")}
            placeholder="5xxxxxxxx"
            type="tel"
            required
            value={currentItem.mobile || ""}
            onChange={(e) => handleInputChange("mobile", e.target.value)}
            error={showValidationErrors ? localErrors.mobile : ""}
            disabled={isLimitReached && !currentItem.id}
          />
          <CategorySelect
            label={t("category")}
            placeholder={t("category_placeholder")}
            searchPlaceholder={t("category_search")}
            noneLabel={t("category_none")}
            createLabel={(q) => t("category_create", { q })}
            value={currentItem.category || ""}
            onChange={(val) => handleInputChange("category", val)}
            options={categoryOptions}
            disabled={isLimitReached && !currentItem.id}
          />
        </div>

        <ActionButtons
          onDownload={handleExportCSV}
          onAddOne={handleAdd}
          onEdit={() => handleEdit(currentItem.id)}
          onCancel={resetLocal}
          fileInputRef={fileInputRef}
          isEditing={isEditing}
          isAddDisabled={isLimitReached && !isEditing}
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCSV}
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
      />
    </>
  );
};

export default GuestImporter;
