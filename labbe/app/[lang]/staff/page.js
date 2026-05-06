"use client";
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import Header from "./_components/header/Header";
import Cards from "./_components/cards/Cards";
import List from "./_components/list/List";
import SuccessAndFaild from "./_components/successAndFaild/SuccessAndFaild";
import QRScanner from "./_components/qrScanner/QRScanner";
import ScanIcon from "./_components/scanIcon/ScanIcon";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useStaffAuth } from "./hooks/useStaffAuth";
import { useStaffGuests } from "./hooks/useStaffGuests";
import { staffService } from "@/services/staff";
import { handleError } from "@/services/errorHandlingService";
import styles from "./page.module.css";

export default function StaffPage() {
  const { t } = useTranslation("staff");

  // Auth
  const { isAuthenticated, isLoading, authError, staffInfo, eventInfo, eventId } =
    useStaffAuth();

  // Guests (React Query)
  const { guests, stats, isLoading: guestsLoading, invalidate } = useStaffGuests(
    eventId,
    isAuthenticated
  );

  // Modal / check-in state
  const [showModal, setShowModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Handle guest check-in by list click
  const handleCheckIn = useCallback(
    async (guest) => {
      try {
        const response = await staffService.checkInById(eventId, guest._id);
        setCheckInResult({
          success: true,
          guest: response.data.guest,
          alreadyCheckedIn: response.data.alreadyCheckedIn,
        });
        invalidate();
      } catch (error) {
        handleError(error, t, { fallbackMessage: "errors.checkInFailed" });
        setCheckInResult({ success: false });
      } finally {
        setShowModal(true);
      }
    },
    [eventId, invalidate, t]
  );

  const handleGuestClick = useCallback(
    (guest) => {
      setSelectedGuest(guest);
      handleCheckIn(guest);
    },
    [handleCheckIn]
  );

  // Handle QR code scan
  const handleQRScan = useCallback(
    async (qrData) => {
      try {
        const response = await staffService.checkInByQR(eventId, qrData);
        setCheckInResult({
          success: true,
          guest: response.data.guest,
          alreadyCheckedIn: response.data.alreadyCheckedIn,
        });
        invalidate();
      } catch (error) {
        handleError(error, t, { fallbackMessage: "errors.checkInFailed" });
        setCheckInResult({ success: false });
      } finally {
        setShowModal(true);
      }
    },
    [eventId, invalidate, t]
  );

  const handleOpenScanner = useCallback(() => setShowQRScanner(true), []);
  const handleCloseModal = useCallback(() => setShowModal(false), []);
  const handleCloseScanner = useCallback(() => setShowQRScanner(false), []);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.staffPage}>
        <div className={styles.loadingContainer}>
          <SimpleLoading message={t("loading")} />
        </div>
      </div>
    );
  }

  // Error state
  if (authError) {
    return (
      <div className={styles.staffPage}>
        <div className={styles.errorContainer}>
          <AlertTriangle className={styles.errorIcon} />
          <h2>{t("errors.accessError")}</h2>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.staffPage}>
      <div className={styles.contentWrapper}>
        <Header eventName={eventInfo?.title || t("defaultEventName")} />
        <Cards stats={stats} t={t} />
        <List
          onGuestClick={handleGuestClick}
          guests={guests}
          t={t}
          loading={guestsLoading}
        />
      </div>

      <div className={styles.floatingButton}>
        <button
          className={styles.scanButton}
          aria-label={t("scanQrCode")}
          onClick={handleOpenScanner}
        >
          <ScanIcon />
        </button>
      </div>

      <SuccessAndFaild
        isOpen={showModal}
        onClose={handleCloseModal}
        guest={selectedGuest}
        result={checkInResult}
        t={t}
      />

      <QRScanner
        isOpen={showQRScanner}
        onClose={handleCloseScanner}
        onScan={handleQRScan}
        t={t}
      />
    </div>
  );
}
