"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import Header from "./_components/header/Header";
import Cards from "./_components/cards/Cards";
import List from "./_components/list/List";
import SuccessAndFaild from "./_components/successAndFaild/SuccessAndFaild";
import QRScanner from "./_components/qrScanner/QRScanner";
import { staffService } from "@/services/staff";
import styles from "./page.module.css";

export default function StaffPage() {
  const { t } = useTranslation("staff");
  const searchParams = useSearchParams();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Staff and event data
  const [staffInfo, setStaffInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventId, setEventId] = useState(null);

  // Guest data
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    declined: 0,
    pending: 0,
  });
  const [guestsLoading, setGuestsLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Verify staff access on mount
  useEffect(() => {
    const verifyAccess = async () => {
      const token = searchParams.get("token");
      const phone = searchParams.get("phone");
      const eventIdParam = searchParams.get("eventId");

      try {
        let response;
        if (token) {
          response = await staffService.verifyByToken(token);
        } else if (phone && eventIdParam) {
          response = await staffService.verifyByPhone(phone, eventIdParam);
        } else if (staffService.isAuthenticated()) {
          // Already authenticated, fetch data
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          setAuthError(
            t(
              "errors.noAccessToken",
              "رابط غير صالح. يرجى استخدام الرابط المرسل إليك."
            )
          );
          setIsLoading(false);
          return;
        }

        if (response.data?.verified) {
          setIsAuthenticated(true);
          setStaffInfo(response.data.staff);
          setEventInfo(response.data.event);
          setEventId(response.data.event._id);
        } else {
          setAuthError(
            t("errors.accessDenied", "ليس لديك صلاحية الوصول لهذه المناسبة.")
          );
        }
      } catch (error) {
        console.error("Staff verification error:", error);
        setAuthError(
          error.message ||
            t("errors.verificationFailed", "فشل التحقق من الصلاحية.")
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [searchParams, t]);

  // Fetch guests when authenticated
  const fetchGuests = useCallback(async () => {
    if (!eventId) return;

    try {
      setGuestsLoading(true);
      const response = await staffService.getGuests(eventId);
      if (response.data) {
        setGuests(response.data.guests || []);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
    } finally {
      setGuestsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isAuthenticated && eventId) {
      fetchGuests();
    }
  }, [isAuthenticated, eventId, fetchGuests]);

  // Handle guest check-in
  const handleCheckIn = async (guest) => {
    try {
      const response = await staffService.checkInById(eventId, guest._id);
      setCheckInResult({
        success: true,
        guest: response.data.guest,
        alreadyCheckedIn: response.data.alreadyCheckedIn,
      });
      setShowModal(true);
      // Refresh guest list
      fetchGuests();
    } catch (error) {
      setCheckInResult({
        success: false,
        error: error.message,
      });
      setShowModal(true);
    }
  };

  const handleGuestClick = (guest) => {
    setSelectedGuest(guest);
    handleCheckIn(guest);
  };

  // Handle QR code scan
  const handleQRScan = async (qrData) => {
    try {
      const response = await staffService.checkInByQR(eventId, qrData);
      setCheckInResult({
        success: true,
        guest: response.data.guest,
        alreadyCheckedIn: response.data.alreadyCheckedIn,
      });
      setShowModal(true);
      fetchGuests();
    } catch (error) {
      setCheckInResult({
        success: false,
        error: error.message || t("errors.checkInFailed", "فشل تسجيل الحضور"),
      });
      setShowModal(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.staffPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>{t("loading", "جاري التحميل...")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (authError) {
    return (
      <div className={styles.staffPage}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>{t("errors.accessError", "خطأ في الوصول")}</h2>
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
          staffName={staffInfo?.name}
        />
        <Cards stats={stats} t={t} />
        <List
          handleGuestClick={handleGuestClick}
          guests={guests}
          t={t}
          loading={guestsLoading}
        />
      </div>

      <div className={styles.floatingButton}>
        <button
          className={styles.scanButton}
          aria-label="Scan QR Code"
          onClick={() => setShowQRScanner(true)}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 11.25V8.125C2.5 5.0125 5.0125 2.5 8.125 2.5H11.25"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.75 2.5H21.875C24.9875 2.5 27.5 5.0125 27.5 8.125V11.25"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M27.5 20V21.875C27.5 24.9875 24.9875 27.5 21.875 27.5H20"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.25 27.5H8.125C5.0125 27.5 2.5 24.9875 2.5 21.875V18.75"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.125 8.75V11.25C13.125 12.5 12.5 13.125 11.25 13.125H8.75C7.5 13.125 6.875 12.5 6.875 11.25V8.75C6.875 7.5 7.5 6.875 8.75 6.875H11.25C12.5 6.875 13.125 7.5 13.125 8.75Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.125 8.75V11.25C23.125 12.5 22.5 13.125 21.25 13.125H18.75C17.5 13.125 16.875 12.5 16.875 11.25V8.75C16.875 7.5 17.5 6.875 18.75 6.875H21.25C22.5 6.875 23.125 7.5 23.125 8.75Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.125 18.75V21.25C13.125 22.5 12.5 23.125 11.25 23.125H8.75C7.5 23.125 6.875 22.5 6.875 21.25V18.75C6.875 17.5 7.5 16.875 8.75 16.875H11.25C12.5 16.875 13.125 17.5 13.125 18.75Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.125 18.75V21.25C23.125 22.5 22.5 23.125 21.25 23.125H18.75C17.5 23.125 16.875 22.5 16.875 21.25V18.75C16.875 17.5 17.5 16.875 18.75 16.875H21.25C22.5 16.875 23.125 17.5 23.125 18.75Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <SuccessAndFaild
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        guest={selectedGuest}
        result={checkInResult}
        t={t}
      />

      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        t={t}
      />
    </div>
  );
}
