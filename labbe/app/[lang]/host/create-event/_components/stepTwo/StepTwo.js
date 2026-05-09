"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./stepTwo.module.css";
import GuestQuotaCounter from "@/ui/host/subscription/GuestQuotaCounter";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import GuestImporter from "./GuestImporter";
import GuestTable from "./GuestTable";

/**
 * When an event is `live`, the update wizard passes `allowAddOnly={true}`
 * so that Step 2 stays interactive for adding new guests but the existing
 * rows (and bulk actions) become read-only. Outside step 2 the entire
 * form is disabled by the wizard's outer fieldset; here we just gate the
 * per-row actions.
 */
const StepTwo = ({ subscription, allowAddOnly = false }) => {
  const { watch, setValue } = useFormContext();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation("createEvent");

  const [currentItem, setCurrentItem] = useState({ name: "", mobile: "" });
  const [importErrors, setImportErrors] = useState([]);
  const [showImportLimitPopup, setShowImportLimitPopup] = useState(false);
  const [importLimitInfo, setImportLimitInfo] = useState({
    inserted: 0,
    skipped: 0,
  });

  // Watch guest list from form
  const watchedGuestList = watch("guestList");
  const guestList = useMemo(() => watchedGuestList || [], [watchedGuestList]);

  // Backend shape: { guestLimit, isGuestUnlimited, isPoolPlan, invitePool, invitesRemaining }
  // Pool plans report `isGuestUnlimited: true` (no per-event cap) but the global
  // pool is still the effective constraint for THIS event — surface it so users
  // don't sail past their pool and get a 403 at submit.
  const isPoolPlan = subscription?.isPoolPlan === true;
  const invitesRemaining = Number.isFinite(subscription?.invitesRemaining)
    ? subscription.invitesRemaining
    : null;
  const isUnlimited = (subscription?.isGuestUnlimited ?? false) && !isPoolPlan;
  const guestLimit = isPoolPlan
    ? (invitesRemaining ?? 0)
    : (subscription?.guestLimit ?? 0);
  const isLimitReached = !isUnlimited && guestList.length >= guestLimit;

  const resetCurrentItem = useCallback(() => {
    setCurrentItem({ name: "", mobile: "" });
  }, []);

  // Remove handler
  const handleRemove = useCallback(
    (id) => {
      const updatedList = guestList.filter((item) => item.id !== id);
      setValue("guestList", updatedList, { shouldValidate: true });
      if (currentItem.id === id) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, currentItem.id, resetCurrentItem]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    (selectedIds) => {
      if (!selectedIds || selectedIds.length === 0) return;
      const updatedList = guestList.filter(
        (item) => !selectedIds.includes(item.id)
      );
      setValue("guestList", updatedList, { shouldValidate: true });
      if (selectedIds.includes(currentItem.id)) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, currentItem.id, resetCurrentItem]
  );

  // Edit click handler — populates the importer form with the row's values.
  const handleEditClick = useCallback(
    (id) => {
      const item = guestList.find((item) => item.id === id);
      if (item) {
        setCurrentItem({
          name: item.name || "",
          mobile: item.mobile || "",
          id: item.id,
        });
      }
    },
    [guestList]
  );

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

      <GuestImporter
        guestList={guestList}
        setValue={setValue}
        isLimitReached={isLimitReached}
        isUnlimited={isUnlimited}
        guestLimit={guestLimit}
        currentItem={currentItem}
        setCurrentItem={setCurrentItem}
        resetCurrentItem={resetCurrentItem}
        setImportErrors={setImportErrors}
        setImportLimitInfo={setImportLimitInfo}
        setShowImportLimitPopup={setShowImportLimitPopup}
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

      <GuestTable
        guestList={guestList}
        allowAddOnly={allowAddOnly}
        handleEditClick={handleEditClick}
        handleRemove={handleRemove}
        handleBulkDelete={handleBulkDelete}
      />

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
