"use client";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./stepTwo.module.css";
import GuestQuotaCounter from "@/ui/host/subscription/GuestQuotaCounter";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import GuestImporter from "./GuestImporter";
import GuestTable from "./GuestTable";
import ReuseGuestsModal from "@/components/guests/reuseGuests/ReuseGuestsModal";
import VCardImportModal from "@/components/guests/vcardImport/VCardImportModal";
import { useMyContacts } from "@/hooks/guests/queries";
import { toastUtils } from "@/utils/toastUtils";
import {
  isContactPickerSupported,
  pickPhoneContacts,
} from "@/utils/contacts/phoneContacts";

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

  const [currentItem, setCurrentItem] = useState({ name: "", mobile: "", category: "" });
  // Mirrors `currentItem.id` so the delete callbacks below don't take a
  // dependency on it. Without this, every keystroke in the importer
  // inputs would change `currentItem`, change `handleRemove`/`handleBulkDelete`
  // identities, and re-render the (potentially large) GuestTable — which
  // is the source of the mobile freeze in the update-event flow.
  const currentItemIdRef = useRef(undefined);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportLimitPopup, setShowImportLimitPopup] = useState(false);
  const [importLimitInfo, setImportLimitInfo] = useState({
    inserted: 0,
    skipped: 0,
  });
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [showVcardModal, setShowVcardModal] = useState(false);
  // Contact Picker API is Android-Chrome only; resolve client-side to avoid
  // a hydration mismatch.
  const [supportsPicker, setSupportsPicker] = useState(false);
  useEffect(() => {
    setSupportsPicker(isContactPickerSupported());
  }, []);

  // The host's saved category labels — feeds the manual-add combobox and is
  // independent of the reuse modal's own paged fetch.
  const { data: contactsMeta } = useMyContacts({ page: 1, limit: 1 });
  const savedCategories = contactsMeta?.data?.categories || [];

  const setCurrentItemTracked = useCallback((updater) => {
    setCurrentItem((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      currentItemIdRef.current = next?.id;
      return next;
    });
  }, []);

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
    setCurrentItemTracked({ name: "", mobile: "", category: "" });
  }, [setCurrentItemTracked]);

  // Remove handler — reads `currentItem.id` from the ref so it stays
  // identity-stable across keystrokes (see comment above the ref).
  const handleRemove = useCallback(
    (id) => {
      const updatedList = guestList.filter((item) => item.id !== id);
      setValue("guestList", updatedList, { shouldValidate: true });
      if (currentItemIdRef.current === id) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, resetCurrentItem]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    (selectedIds) => {
      if (!selectedIds || selectedIds.length === 0) return;
      const updatedList = guestList.filter(
        (item) => !selectedIds.includes(item.id)
      );
      setValue("guestList", updatedList, { shouldValidate: true });
      if (selectedIds.includes(currentItemIdRef.current)) {
        resetCurrentItem();
      }
    },
    [guestList, setValue, resetCurrentItem]
  );

  // Edit click handler — populates the importer form with the row's values.
  const handleEditClick = useCallback(
    (id) => {
      const item = guestList.find((item) => item.id === id);
      if (item) {
        setCurrentItemTracked({
          name: item.name || "",
          mobile: item.mobile || "",
          category: item.category || "",
          id: item.id,
        });
      }
    },
    [guestList, setCurrentItemTracked]
  );

  const remainingCapacity = isUnlimited
    ? Infinity
    : Math.max(0, guestLimit - guestList.length);

  // Shared merge path for the reuse picker AND phone import: dedupe by phone
  // against the current list, respect the remaining list capacity (free at
  // list time — no invite is consumed), and surface a skipped count. The
  // existing create/step2 save then persists category + guests.
  const mergeIncomingGuests = useCallback(
    (incoming) => {
      const existing = new Set(guestList.map((g) => g.mobile));
      const fresh = [];
      for (const c of incoming || []) {
        if (!c.mobile || existing.has(c.mobile)) continue;
        existing.add(c.mobile);
        fresh.push({
          name: c.name || "",
          mobile: c.mobile,
          category: c.category || "",
          id: `${Date.now()}_${Math.random()}`,
        });
      }
      const remaining = isUnlimited
        ? Infinity
        : Math.max(0, guestLimit - guestList.length);
      const toAdd = fresh.slice(0, remaining);
      const skipped = fresh.length - toAdd.length;
      if (toAdd.length > 0) {
        setValue("guestList", [...guestList, ...toAdd], { shouldValidate: true });
      }
      if (skipped > 0) {
        setImportLimitInfo({ inserted: toAdd.length, skipped });
        setShowImportLimitPopup(true);
      }
      return { added: toAdd.length, skipped };
    },
    [guestList, setValue, isUnlimited, guestLimit]
  );

  const handlePhonePick = useCallback(async () => {
    try {
      const picked = await pickPhoneContacts();
      const { added } = mergeIncomingGuests(picked);
      if (added > 0) {
        toastUtils.success(t("phone_import_added", { count: added }));
      }
    } catch (e) {
      if (e?.message !== "contact_picker_unsupported") {
        toastUtils.error(t("phone_import_failed"));
      }
    }
  }, [mergeIncomingGuests, t]);

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

      {/* Additional guest sources: reuse the host's guest book, and (on
          supported browsers / Android Chrome) import from phone contacts.
          Both merge into the local list and persist via the normal save. */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <Button
          variant="secondary"
          title={t("add_from_my_guests")}
          onClick={() => setShowReuseModal(true)}
          disabled={isLimitReached}
        />
        {supportsPicker && (
          <Button
            variant="secondary"
            title={t("import_from_phone")}
            onClick={handlePhonePick}
            disabled={isLimitReached}
          />
        )}
        <Button
          variant="secondary"
          title={t("vcard_button")}
          onClick={() => setShowVcardModal(true)}
          disabled={isLimitReached}
        />
      </div>

      <GuestImporter
        guestList={guestList}
        setValue={setValue}
        isLimitReached={isLimitReached}
        isUnlimited={isUnlimited}
        guestLimit={guestLimit}
        currentItem={currentItem}
        setCurrentItem={setCurrentItemTracked}
        resetCurrentItem={resetCurrentItem}
        setImportErrors={setImportErrors}
        setImportLimitInfo={setImportLimitInfo}
        setShowImportLimitPopup={setShowImportLimitPopup}
        categories={savedCategories}
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

      {/* Reuse-from-guest-book picker */}
      <ReuseGuestsModal
        isOpen={showReuseModal}
        onClose={() => setShowReuseModal(false)}
        onAdd={(selected) => {
          const { added } = mergeIncomingGuests(selected);
          if (added > 0) {
            toastUtils.success(t("reuse_guests_added_toast", { count: added }));
          }
        }}
        existingMobiles={guestList.map((g) => g.mobile)}
        remainingCapacity={remainingCapacity}
      />

      {/* Import from an uploaded contacts file (.vcf) — all browsers */}
      <VCardImportModal
        isOpen={showVcardModal}
        onClose={() => setShowVcardModal(false)}
        onAdd={(selected) => {
          const { added } = mergeIncomingGuests(selected);
          if (added > 0) {
            toastUtils.success(t("reuse_guests_added_toast", { count: added }));
          }
        }}
        existingMobiles={guestList.map((g) => g.mobile)}
        remainingCapacity={remainingCapacity}
      />
    </div>
  );
};

export default StepTwo;
