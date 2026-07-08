"use client";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Header from "./_components/header/Header";
import Cards from "./_components/cards/Cards";
import List from "./_components/list/List";
import Filters from "./_components/filters/Filters";
import SuccessAndFaild from "./_components/successAndFaild/SuccessAndFaild";
import QRScanner from "./_components/qrScanner/QRScanner";
import ScanIcon from "./_components/scanIcon/ScanIcon";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import { useStaffAuth } from "./hooks/useStaffAuth";
import {
  useStaffEventGuests,
  useStaffMutation,
} from "@/hooks/staff";
import { handleError } from "@/services/errorHandlingService";
import styles from "./page.module.css";

const EMPTY_STATS = {
  total: 0,
  confirmed: 0,
  checkedIn: 0,
  declined: 0,
  maybe: 0,
  pending: 0,
  lastCheckIn: null,
};

function StaffPageInner() {
  const { t } = useTranslation("staff");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isAuthenticated, isLoading, authError, eventInfo, eventId } =
    useStaffAuth();

  const search = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";

  const guestsQuery = useStaffEventGuests(
    eventId,
    { search, status },
    { enabled: !!eventId && isAuthenticated }
  );
  const guests = guestsQuery.data?.guests || [];
  const stats = guestsQuery.data?.stats || EMPTY_STATS;

  const checkInMutation = useStaffMutation("checkInGuest");

  const [showModal, setShowModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const setFilters = useCallback(
    ({ search: nextSearch, status: nextStatus }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) params.set("q", nextSearch);
      else params.delete("q");
      if (nextStatus) params.set("status", nextStatus);
      else params.delete("status");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const performCheckIn = useCallback(
    async (payload) => {
      try {
        const response = await checkInMutation.mutateAsync({
          eventId,
          ...payload,
        });
        setCheckInResult({
          success: true,
          guest: response.data.guest,
          alreadyCheckedIn: response.data.alreadyCheckedIn,
        });
      } catch (error) {
        handleError(error, t, { fallbackMessage: "errors.checkInFailed" });
        setCheckInResult({ success: false });
      } finally {
        setShowModal(true);
      }
    },
    [checkInMutation, eventId, t]
  );

  const handleGuestClick = useCallback(
    (guest) => {
      setSelectedGuest(guest);
      performCheckIn({ guestId: guest._id });
    },
    [performCheckIn]
  );

  const handleQRScan = useCallback(
    (qrData) => performCheckIn({ qrCode: qrData }),
    [performCheckIn]
  );

  const handleOpenScanner = useCallback(() => setShowQRScanner(true), []);
  const handleCloseModal = useCallback(() => setShowModal(false), []);
  const handleCloseScanner = useCallback(() => setShowQRScanner(false), []);

  if (isLoading) {
    return (
      <div className={styles.staffPage}>
        <div className={styles.loadingContainer}>
          <SimpleLoading message={t("loading")} />
        </div>
      </div>
    );
  }

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
        <Header
          eventName={eventInfo?.title || t("defaultEventName")}
          event={eventInfo}
        />
        <Cards stats={stats} t={t} />
        <Filters
          search={search}
          status={status}
          onChange={setFilters}
          t={t}
        />
        <List
          onGuestClick={handleGuestClick}
          guests={guests}
          t={t}
          loading={guestsQuery.isLoading}
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

export default function StaffPage() {
  return (
    <ErrorBoundary>
      <StaffPageInner />
    </ErrorBoundary>
  );
}
