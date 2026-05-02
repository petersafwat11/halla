"use client";
import React, { useState } from "react";
import styles from "./LastEventStats.module.css";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import Image from "next/image";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import TestMessagePopup from "../TestMessagePopup";
import ScheduleSendingPopup from "@/ui/host/popups/scheduleSendingPopup/ScheduleSendingPopup";
import { useHostDashboard } from "@/hooks/reactQueryHooks/useDashboard";
import { useEventMutation } from "@/hooks/reactQueryHooks/useEvents";
import { toast } from "react-toastify";

function LastEventStats() {
  const { t } = useTranslation("home-events");
  const isMobile = useMediaQuery("(max-width: 550px)");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [showTestMessagePopup, setShowTestMessagePopup] = useState(false);

  const { data: responseData, isLoading } = useHostDashboard();
  const notifyStaffMutation = useEventMutation("notifyStaff");
  const actualData = responseData?.data || responseData;
  const event = actualData?.lastEvent;
  const subscription = actualData?.subscription;

  const data = event || {};
  const [testMessageSent, setTestMessageSent] = useState(
    data.testMessageSent || false
  );

  const hasTemplate = !!(data.invitationSettings?.selectedTemplate?.name);
  const canSendTest = hasTemplate && !testMessageSent;
  const canSchedule = hasTemplate && testMessageSent;
  const isCompleted = data.status === 'completed';
  const hasStaff = (data?.staffCount || data?.staffList?.length || 0) > 0;

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!data?.id) {
    return null;
  }

  const getUnifiedStatus = () => {
    const statusMap = {
      draft: { text: t("lastEvent.status.draft", "مسودة"), className: styles.statusNotSubmitted },
      scheduled: { text: t("lastEvent.status.scheduled", "مجدول"), className: styles.statusPending },
      live: { text: t("lastEvent.status.active"), className: styles.statusActive },
      completed: { text: t("lastEvent.status.completed", "مكتمل"), className: styles.statusPublished },
      suspended: { text: t("lastEvent.status.suspended"), className: styles.statusSuspended },
    };
    return statusMap[data.status] || { text: t("lastEvent.status.published"), className: styles.statusPublished };
  };

  const statusInfo = getUnifiedStatus();

  // Format date and time using locale
  const formatDateTime = () => {
    if (!data.date) return "";

    try {
      const eventDate = new Date(data.date);
      const locale = currentLocale === "ar" ? "ar-EG" : "en-US";

      const dateStr = eventDate.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const timeStr = data.entryTime || data.time || "";

      return timeStr ? `${dateStr} - ${timeStr}` : dateStr;
    } catch (error) {
      return "";
    }
  };

  const formattedDateTime = formatDateTime();

  // Dropdown menu items - matching the 4 steps in create event
  const dropdownItems = [
    {
      label: t("lastEvent.dropdown.eventDetails"),
      step: 1,
    },
    {
      label: t("lastEvent.dropdown.guestList"),
      step: 2,
    },
    {
      label: t("lastEvent.dropdown.invitationDesign"),
      step: 3,
    },
    {
      label: t("lastEvent.dropdown.invitationCustomization"),
      step: 4,
    },
  ];

  const handleEditClick = (step) => {
    if (data.id) {
      router.push(
        `/${currentLocale}/host/update-event?id=${data.id}&step=${step}`
      );
    }
    setShowDropdown(false);
  };

  const handleViewStats = () => {
    if (data.id) {
      router.push(`/${currentLocale}/host/events/${data.id}`);
    }
  };

  const handleScheduleClick = () => {
    setShowSchedulePopup(true);
  };

  const handleTestMessageClick = () => {
    setShowTestMessagePopup(true);
  };

  const handleTestMessageSuccess = () => {
    setTestMessageSent(true);
    setShowTestMessagePopup(false);
    router.refresh();
  };

  const handleNotifyStaff = async () => {
    if (!data.id) return;
    try {
      await notifyStaffMutation.mutateAsync({ eventId: data.id });
      toast.success(t("staff.notifySuccess", "تم إرسال الإشعار للفريق"));
    } catch (error) {
      toast.error(error?.response?.data?.message || t("staff.notifyError", "فشل إرسال الإشعار"));
    }
  };

  return (
    <div className={styles.eventCard}>
      <div className={styles.container}>
        <div className={styles.eventImage}>
          <div className={styles.imagePlaceholder}>
            <svg
              width={isMobile ? "40" : "80"}
              height={isMobile ? "40" : "80"}
              viewBox={isMobile ? "0 0 40 40" : "0 0 80 80"}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width={isMobile ? "40" : "80"}
                height={isMobile ? "40" : "80"}
                fill="#F2F2F2"
              />
            </svg>
          </div>
        </div>

        <div className={styles.eventInfo}>
          <div className={styles.headerContainer}>
            <div className={styles.titleContainer}>
              <h3 className={styles.eventTitle}>{data.title}</h3>
            </div>
            <div className={`${styles.statusBadge} ${statusInfo.className}`}>
              <span className={styles.statusText}>{statusInfo.text}</span>
            </div>
          </div>

          {!isMobile && (
            <>
              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <Image
                    src="/svg/events/people.svg"
                    alt="guest"
                    width={16}
                    height={16}
                  />
                  <div className={styles.metaText}>{data.guestCount} {t("lastEvent.buttons.guests")}</div>
                </div>
                <div className={styles.metaItem}>
                  <Image
                    src="/svg/events/calendar.svg"
                    alt="date"
                    width={16}
                    height={16}
                  />
                  <div className={styles.metaText}>{formattedDateTime}</div>
                </div>
                <div className={styles.metaItem}>
                  <Image
                    src="/svg/events/location.svg"
                    alt="location"
                    width={16}
                    height={16}
                  />
                  <div className={styles.metaText}>{data.locationName || data.location?.address || data.location?.city || data.location || ''}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!isMobile && (
        <div className={styles.divider}>
          <svg
            width="529"
            height="1"
            viewBox="0 0 529 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0.5C6.27893 0.5 355.283 0.5 529 0.5" stroke="#F2F2F2" />
          </svg>
        </div>
      )}

      {isMobile && (
        <div className={styles.responseRateSection}>
          <div className={styles.responseRateContainer}>
            <div className={styles.responseRateHeader}>
              <div className={styles.responseRateLabel}>
                {t("lastEvent.responseStatus")}
              </div>
              <div className={styles.responseRateText}>{data.responseRate}</div>
            </div>
            <div className={styles.responseLegend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.dotGray}`}></div>

                <div className={styles.legendText}>
                  <span>{t("lastEvent.noResponse")}: </span>
                  <span>{data.stats.pending}</span>
                </div>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.dotRed}`}></div>

                <div className={styles.legendText}>
                  <span>{t("lastEvent.declined")}: </span>

                  <span>{data.stats.declined}</span>
                </div>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.dotGreen}`}></div>

                <div className={styles.legendText}>
                  <span>{t("lastEvent.approved")}: </span>

                  <span>{data.stats.approved}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className={styles.statsContainer}>
          <div className={styles.statBox}>
            <div className={styles.statLabel}>{t("lastEvent.noResponse")}</div>
            <div className={styles.statValue}>{data.stats.pending}</div>
          </div>
          <div className={`${styles.statBox} ${styles.statBoxDeclined}`}>
            <div className={`${styles.statLabel} ${styles.statLabelDeclined}`}>
              {t("lastEvent.declined")}
            </div>
            <div className={`${styles.statValue} ${styles.statValueDeclined}`}>
              {data.stats.declined}
            </div>
          </div>
          <div className={`${styles.statBox} ${styles.statBoxApproved}`}>
            <div className={`${styles.statLabel} ${styles.statLabelApproved}`}>
              {t("lastEvent.approved")}
            </div>
            <div className={`${styles.statValue} ${styles.statValueApproved}`}>
              {data.stats.approved}
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className={styles.divider}>
          <svg
            width="529"
            height="1"
            viewBox="0 0 529 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0.5C6.27893 0.5 355.283 0.5 529 0.5" stroke="#F2F2F2" />
          </svg>
        </div>
      )}

      {/* Subscription Quota Section */}
      {subscription && (
        <div className={styles.subscriptionQuota}>
          <div className={styles.quotaItem}>
            <div className={styles.quotaLabel}>
              {t("lastEvent.quota.remainingGuests")}
            </div>
            <div className={styles.quotaValue}>
              {data.quota?.remainingGuests ?? 0}
            </div>
          </div>
          <div className={styles.quotaSeparator} />
          <div className={styles.quotaItem}>
            <div className={styles.quotaLabel}>
              {t("lastEvent.quota.compensationMessages")}
            </div>
            <div className={styles.quotaValue}>
              {data.quota?.compensationMessages ?? 0}
            </div>
          </div>
        </div>
      )}

      {!isMobile && subscription && (
        <div className={styles.divider}>
          <svg
            width="529"
            height="1"
            viewBox="0 0 529 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0.5C6.27893 0.5 355.283 0.5 529 0.5" stroke="#F2F2F2" />
          </svg>
        </div>
      )}

      <div className={styles.actionsContainer}>
        {isMobile ? (
          <>
            <div className={styles.dropdownWrapper}>
              <button
                className={styles.primaryButton}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Image
                  src="/svg/events/edit.svg"
                  alt="edit"
                  width={12}
                  height={12}
                />
                <span>{t("lastEvent.editEvent")}</span>
                <Image
                  src="/svg/events/arrow-down.svg"
                  alt="arrow-down"
                  width={12}
                  height={12}
                  style={{
                    transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {showDropdown && (
                <div className={styles.dropdown}>
                  {dropdownItems.map((item) => (
                    <button
                      key={item.step}
                      className={styles.dropdownItem}
                      onClick={() => handleEditClick(item.step)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.secondaryActions}>
              {canSendTest && (
                <button
                  className={styles.outlineButton}
                  onClick={handleTestMessageClick}
                >
                  <span>{t("lastEvent.buttons.testMessage")}</span>
                  <Image
                    src="/svg/events/calendar-edit.svg"
                    alt="test"
                    width={12}
                    height={12}
                  />
                </button>
              )}
              {canSchedule && (
                <button
                  className={styles.outlineButton}
                  onClick={handleScheduleClick}
                >
                  <span>{t("lastEvent.buttons.scheduleEvent")}</span>
                  <Image
                    src="/svg/events/calendar-edit.svg"
                    alt="calendar"
                    width={12}
                    height={12}
                  />
                </button>
              )}
              {hasStaff && (
                <button
                  className={styles.outlineButton}
                  onClick={handleNotifyStaff}
                  disabled={notifyStaffMutation.isPending}
                >
                  <span>{notifyStaffMutation.isPending ? t("staff.notifying", "جارٍ الإرسال...") : t("staff.notifyStaff", "إشعار الفريق")}</span>
                </button>
              )}
              <button
                className={styles.outlineButton}
                onClick={handleViewStats}
              >
                <span>{t("lastEvent.viewStats")}</span>
                <Image
                  src="/svg/events/diagram.svg"
                  alt="diagram"
                  width={12}
                  height={12}
                />
              </button>
              {isCompleted && (
                <button
                  className={styles.outlineButton}
                  onClick={() => router.push(`/${currentLocale}/host/post-event/${data.id}`)}
                >
                  <span>{t("lastEvent.buttons.sharePostEvent", "مشاركة ما بعد المناسبة")}</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {canSendTest && (
              <button
                className={styles.outlineButton}
                onClick={handleTestMessageClick}
              >
                <span>{t("lastEvent.buttons.testMessage")}</span>
                <Image
                  src="/svg/events/calendar-edit.svg"
                  alt="test"
                  width={12}
                  height={12}
                />
              </button>
            )}
            {canSchedule && (
              <button
                className={styles.outlineButton}
                onClick={handleScheduleClick}
              >
                <span>{t("lastEvent.buttons.scheduleEvent")}</span>
                <Image
                  src="/svg/events/calendar-edit.svg"
                  alt="calendar"
                  width={12}
                  height={12}
                />
              </button>
            )}
            {hasStaff && (
              <button
                className={styles.outlineButton}
                onClick={handleNotifyStaff}
                disabled={notifyStaffMutation.isPending}
              >
                <span>{notifyStaffMutation.isPending ? t("staff.notifying", "جارٍ الإرسال...") : t("staff.notifyStaff", "إشعار الفريق")}</span>
              </button>
            )}
            <button className={styles.outlineButton} onClick={handleViewStats}>
              <span>{t("lastEvent.viewStats")}</span>
              <Image
                src="/svg/events/diagram.svg"
                alt="diagram"
                width={12}
                height={12}
              />
            </button>
            {isCompleted && (
              <button
                className={styles.outlineButton}
                onClick={() => router.push(`/${currentLocale}/host/post-event/${data.id}`)}
              >
                <span>{t("lastEvent.buttons.sharePostEvent", "مشاركة ما بعد المناسبة")}</span>
              </button>
            )}
            <div className={styles.dropdownWrapper}>
              <button
                className={styles.primaryButton}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Image
                  src="/svg/events/edit.svg"
                  alt="edit"
                  width={12}
                  height={12}
                />
                <span>{t("lastEvent.editEvent")}</span>
                <Image
                  src="/svg/events/arrow-down.svg"
                  alt="arrow-down"
                  width={12}
                  height={12}
                  style={{
                    transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {showDropdown && (
                <div className={styles.dropdown}>
                  {dropdownItems.map((item) => (
                    <button
                      key={item.step}
                      className={styles.dropdownItem}
                      onClick={() => handleEditClick(item.step)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <PopupWrapper
        isOpen={showTestMessagePopup}
        onClose={() => setShowTestMessagePopup(false)}
      >
        <TestMessagePopup
          onConfirm={handleTestMessageSuccess}
          onCancel={() => setShowTestMessagePopup(false)}
          eventId={data.id}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showSchedulePopup}
        onClose={() => setShowSchedulePopup(false)}
      >
        <ScheduleSendingPopup
          onClose={() => setShowSchedulePopup(false)}
          eventId={data.id}
          onSuccess={() => router.refresh()}
          existingSchedule={data.launchSettings}
        />
      </PopupWrapper>
    </div>
  );
}

export default LastEventStats;
