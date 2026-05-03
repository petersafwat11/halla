"use client";
import React, { useState, useRef, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./stepTwo.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import ActionButtons from "./actionButtons/ActionButtons";
import Table from "@/ui/commen/new-table/Table";
import { exportToXLSX, importFromXLSX } from "@/utils/xlsxUtils";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import GuestQuotaCounter from "@/ui/host/subscription/GuestQuotaCounter";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";

/**
 * Phase 4b W1-UPD (D10): when an event is `live`, the update wizard
 * passes `allowAddOnly={true}` so that Step 2 stays interactive for
 * adding new guests but the existing rows (and bulk actions) become
 * read-only. Outside step 2 the entire form is disabled by the
 * wizard's outer fieldset; here we just gate the per-row actions.
 */
const StepTwo = ({ subscription, allowAddOnly = false }) => {
  const { watch, setValue } = useFormContext();
  const fileInputRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation("createEvent");

  const [currentItem, setCurrentItem] = useState({ name: "", mobile: "" });
  const [localErrors, setLocalErrors] = useState({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportLimitPopup, setShowImportLimitPopup] = useState(false);
  const [importLimitInfo, setImportLimitInfo] = useState({
    inserted: 0,
    skipped: 0,
  });

  // Watch guest list from form
  const watchedGuestList = watch("guestList");
  const guestList = useMemo(() => watchedGuestList || [], [watchedGuestList]);

  // Calculate remaining guests based on subscription
  // Handle both data structures: guests.limitPerEvent (from getSubscriptionInfo) and limits.maxGuestsPerEvent (from auth)
  const guestLimit =
    subscription?.guests?.limitPerEvent ||
    subscription?.limits?.maxGuestsPerEvent ||
    subscription?.maxGuests ||
    0;
  const isUnlimited =
    subscription?.guests?.isUnlimited ||
    subscription?.limits?.maxGuestsPerEvent === -1 ||
    subscription?.maxGuests === -1 ||
    false;
  const remainingGuests = isUnlimited
    ? Infinity
    : Math.max(0, guestLimit - guestList.length);
  const isLimitReached = !isUnlimited && guestList.length >= guestLimit;

  // Reset current item
  const resetCurrentItem = () => {
    setCurrentItem({ name: "", mobile: "" });
    setLocalErrors({});
    setShowValidationErrors(false);
  };

  // Input change handler
  const handleInputChange = useCallback((field, value) => {
    setCurrentItem((prev) => ({ ...prev, [field]: value }));
    setLocalErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setShowValidationErrors(false);
  }, []);

  // Validation
  const validateItem = useCallback(() => {
    const newErrors = {};
    const name = (currentItem.name || "").trim();
    const mobile = (currentItem.mobile || "").trim();

    if (!name) {
      newErrors.name = t("validation.guest_name_required");
    }

    if (!mobile) {
      newErrors.mobile = t("validation.mobile_required");
    } else if (!/^5[0-9]{8}$/.test(mobile)) {
      newErrors.mobile = t("validation.mobile_format");
    }

    // Check for duplicate mobile
    if (mobile && !currentItem.id) {
      const mobileExists = guestList.some((item) => item.mobile === mobile);
      if (mobileExists) {
        newErrors.mobile = t("validation.mobile_duplicate");
      }
    }

    setLocalErrors(newErrors);
    setShowValidationErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [currentItem, guestList, t]);

  // Add handler
  const handleAdd = () => {
    // Check if limit reached before adding
    if (isLimitReached) {
      return;
    }
    if (!validateItem()) return;
    try {
      const newItem = {
        name: currentItem.name?.trim() || "",
        mobile: currentItem.mobile?.trim() || "",
        id: Date.now(),
      };
      setValue("guestList", [...guestList, newItem], {
        shouldValidate: true,
      });
      resetCurrentItem();
    } catch (error) {
      console.error("Error adding guest:", error);
    }
  };

  // Edit handler
  const handleEdit = (id) => {
    if (!validateItem()) return;
    try {
      const updatedItem = {
        name: currentItem.name?.trim() || "",
        mobile: currentItem.mobile?.trim() || "",
        id,
      };
      const updatedList = guestList.map((item) =>
        item.id === id ? updatedItem : item
      );
      setValue("guestList", updatedList, { shouldValidate: true });
      resetCurrentItem();
    } catch (error) {
      console.error("Error editing guest:", error);
    }
  };

  // Remove handler
  const handleRemove = useCallback(
    (id) => {
      const updatedList = guestList.filter((item) => item.id !== id);
      setValue("guestList", updatedList, { shouldValidate: true });
      if (currentItem.id === id) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, currentItem.id]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    (selectedIds) => {
      if (!selectedIds || selectedIds.length === 0) return;
      const updatedList = guestList.filter(
        (item) => !selectedIds.includes(item.id)
      );
      setValue("guestList", updatedList, { shouldValidate: true });
      // Reset current item if it was in the deleted list
      if (selectedIds.includes(currentItem.id)) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, currentItem.id]
  );

  // Edit click handler
  const handleEditClick = useCallback(
    (id) => {
      const item = guestList.find((item) => item.id === id);
      if (item) {
        setCurrentItem({
          name: item.name || "",
          mobile: item.mobile || "",
          id: item.id,
        });
        setLocalErrors({});
        setShowValidationErrors(false);
      }
    },
    [guestList]
  );

  // CSV/Excel handlers
  const handleExportCSV = useCallback(() => {
    const headers = [
      { key: "name", label: t("excel_guest_name") },
      { key: "mobile", label: t("excel_phone_number") },
    ];

    const sampleData = [{ name: t("excel_sample_name"), mobile: "512345678" }];
    const fileName = t("excel_template_filename");
    const result = exportToXLSX(headers, sampleData, fileName, true);
    if (!result.success) {
      console.error("Error downloading template");
    }
  }, [t]);

  const handleImportCSV = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Check if limit already reached
      if (isLimitReached) {
        setImportLimitInfo({ inserted: 0, skipped: 0 });
        setShowImportLimitPopup(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setIsImporting(true);
      setImportErrors([]);

      try {
        const headers = [
          { key: "name", label: t("excel_guest_name") },
          { key: "mobile", label: t("excel_phone_number") },
        ];
        const validateRow = (row, index) => {
          const errors = [];
          if (!row.name || !row.name.trim()) {
            errors.push(t("validation.name_required"));
          }
          if (!row.mobile || !row.mobile.trim()) {
            errors.push(t("validation.mobile_required"));
          } else if (!/^5[0-9]{8}$/.test(row.mobile)) {
            errors.push(t("validation.mobile_format_import"));
          }
          return { valid: errors.length === 0, errors };
        };

        const result = await importFromXLSX(file, headers, validateRow);

        if (result.success) {
          const existingMobiles = guestList.map((item) => item.mobile);
          const duplicates = [];
          const validData = result.data.filter((item, index) => {
            if (existingMobiles.includes(item.mobile)) {
              duplicates.push({
                row: index + 2,
                errors: [t("validation.mobile_duplicate_import")],
              });
              return false;
            }
            existingMobiles.push(item.mobile);
            return true;
          });

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

          // Show popup if some guests were skipped due to limit
          if (guestsSkipped > 0) {
            setImportLimitInfo({
              inserted: guestsToInsert.length,
              skipped: guestsSkipped,
            });
            setShowImportLimitPopup(true);
          }

          const allErrors = [...result.errors, ...duplicates];
          if (allErrors.length > 0) {
            setImportErrors(allErrors);
          }
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportErrors([{ row: 0, errors: [error.message] }]);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [guestList, setValue, isLimitReached, isUnlimited, guestLimit, t]
  );

  const isEditing = currentItem.id !== undefined;

  return (
    <div className={styles.stepTwo}>
      {/* Guest Quota Counter */}
      {subscription && (
        <GuestQuotaCounter
          currentGuests={guestList.length}
          subscription={subscription}
        />
      )}

      {/* Limit Reached Message */}
      {isLimitReached && (
        <div className={styles.limitReachedBanner}>
          <span className={styles.limitReachedIcon}>⚠️</span>
          <div className={styles.limitReachedContent}>
            <span className={styles.limitReachedText}>
              {t("guest_limit_reached")}
            </span>
            <button
              className={styles.upgradeLink}
              onClick={() => router.push(`/${pathname.split("/")[1]}/host/plans`)}
            >
              {t("upgrade_plan")}
            </button>
          </div>
        </div>
      )}

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
        </div>

        <ActionButtons
          onDownload={handleExportCSV}
          onAddOne={handleAdd}
          onEdit={() => handleEdit(currentItem.id)}
          onCancel={resetCurrentItem}
          fileInputRef={fileInputRef}
          isEditing={isEditing}
          isAddDisabled={isLimitReached && !isEditing}
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCSV}
        accept=".xlsx,.xls"
        style={{ display: "none" }}
      />

      {/* Import Errors Display */}
      {importErrors.length > 0 && (
        <div className={styles.importErrors}>
          <div className={styles.errorTitle}>{t("import_errors")}</div>
          {importErrors.map((error, index) => (
            <div key={index} className={styles.errorItem}>
              {t("row")} {error.row}: {error.errors.join(", ")}
            </div>
          ))}
        </div>
      )}

      {/* List Table */}
      {guestList.length > 0 && (
        <div className={styles.tableContainer}>
          <Table
            title={t("guest_list_title")}
            headers={[t("name"), t("mobile")]}
            data={guestList}
            // Phase 4b W1-UPD (D10): on live events, existing rows become
            // read-only — host can still add new guests via the form
            // above, but cannot edit or delete rows that already exist.
            actions={
              allowAddOnly
                ? []
                : [
                    {
                      icon: <FiEdit2 size={18} />,
                      text: t("edit"),
                      onClick: (row) => handleEditClick(row.id),
                    },
                    {
                      icon: <FiTrash2 size={18} />,
                      text: t("delete"),
                      onClick: (row) => handleRemove(row.id),
                    },
                  ]
            }
            bulkActions={
              allowAddOnly
                ? []
                : [
                    {
                      icon: <FiTrash2 size={16} />,
                      text: t("delete_selected"),
                      onClick: (selectedIds) => handleBulkDelete(selectedIds),
                    },
                  ]
            }
            showSearch={true}
            showFilter={false}
            showExport={false}
            showCheckboxes={!allowAddOnly}
          />
        </div>
      )}

      {/* Import Limit Popup */}
      <PopupWrapper
        isOpen={showImportLimitPopup}
        onClose={() => setShowImportLimitPopup(false)}
      >
        <div className={styles.importLimitPopup}>
          <div className={styles.popupIcon}>⚠️</div>
          <h3 className={styles.popupTitle}>
            {t("guest_limit_reached")}
          </h3>
          <p className={styles.popupDescription}>
            {importLimitInfo.inserted > 0
              ? t("import_limit_partial", { inserted: importLimitInfo.inserted, skipped: importLimitInfo.skipped })
              : t("import_limit_full")}
          </p>
          <p className={styles.popupHint}>
            {t("upgrade_hint")}
          </p>
          <div className={styles.popupActions}>
            <Button
              variant="primary"
              title={t("upgrade_plan")}
              onClick={() => {
                setShowImportLimitPopup(false);
                router.push(`/${pathname.split("/")[1]}/host/plans`);
              }}
            />
            <Button
              variant="secondary"
              title={t("close")}
              onClick={() => setShowImportLimitPopup(false)}
            />
          </div>
        </div>
      </PopupWrapper>
    </div>
  );
};

export default StepTwo;
