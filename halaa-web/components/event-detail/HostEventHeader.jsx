"use client";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import Button from "@/ui/commen/button/Button";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import StaffPopup from "@/app/[lang]/host/create-event/_components/staffPopup/StaffPopup";
import EventActionsHeader from "@/ui/host/events/EventActionsHeader";
import { useEvent, useEventMutation } from "@/hooks/events";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";

export default function HostEventHeader({ eventId }) {
  const { t } = useTranslation("home-events");
  const { lang } = useParams();
  const router = useRouter();
  const { formatDate } = useLocalizedDate();
  const [showStaffPopup, setShowStaffPopup] = useState(false);

  // React Query hooks
  const { data: eventData } = useEvent(eventId);
  const addStaffMutation = useEventMutation("addStaff");
  const updateStaffMutation = useEventMutation("updateStaff");
  const deleteStaffMutation = useEventMutation("deleteStaff");

  // Extract data — backend returns { status, data: { event: { ... } } }
  const event = eventData?.data?.event || eventData?.event;
  const eventTitle = event?.eventDetails?.title || t("singleEvent.header.eventDetails");
  const staff = event?.staffList || [];

  // Shape staff for StaffPopup which reads `id`, `name`, `phone`.
  const staffList = staff.map((s) => ({
    id: s._id || s.id,
    name: s.name,
    phone: s.phone,
  }));

  const handleEditGuests = () => {
    router.push(`/${lang}/host/update-event?id=${eventId}&step=2`);
  };

  const handleAddStaff = async (staffMember) => {
    const staffData = {
      name: staffMember.name,
      phone: staffMember.phone ?? staffMember.mobile,
    };
    await addStaffMutation.mutateAsync({
      eventId,
      data: staffData,
    });
    setShowStaffPopup(false);
  };

  const handleEditStaff = async (staffMember) => {
    const staffData = {
      name: staffMember.name,
      phone: staffMember.phone ?? staffMember.mobile,
    };
    await updateStaffMutation.mutateAsync({
      eventId,
      staffId: staffMember.id,
      data: staffData,
    });
  };

  const handleDeleteStaff = async (id) => {
    await deleteStaffMutation.mutateAsync({
      eventId,
      staffId: id,
    });
  };

  return (
    <>
      <div className={styles.header}>
        <div>
        <h1 className={styles.title}>
          <button type="button" aria-label={t("singleEvent.header.back")} onClick={() => router.push(`/${lang}/host/events`)} style={{ minWidth: 44, minHeight: 44, border: 0, background: "transparent" }}>
          <IoIosArrowForward
            className={styles.backButton}
            style={{
              transform: lang === "ar" ? "rotate(0deg)" : "rotate(180deg)",
              cursor: "pointer",
              fontSize: "2.4rem",
            }}
          />
          </button>
          {eventTitle}
        </h1>
        <p dir="auto">{formatDate(event?.eventDetails?.date)} · {event?.eventDetails?.time} · {event?.eventDetails?.location?.address}</p>
        </div>
        <div className={styles.actions}>
          <EventActionsHeader event={event} isAdmin={false} />
          {event?.capabilities?.canAddGuest && <Button
            variant="secondary"
            title={t("singleEvent.header.editGuests")}
            onClick={handleEditGuests}
          />}
          {event?.capabilities?.canManageStaff && <Button
            variant="secondary"
            title={t("singleEvent.header.staffDetails")}
            onClick={() => setShowStaffPopup(true)}
          />}
        </div>
      </div>

      <PopupWrapper
        isOpen={showStaffPopup}
        onClose={() => setShowStaffPopup(false)}
      >
        <StaffPopup
          staffList={staffList}
          onAdd={handleAddStaff}
          onEdit={handleEditStaff}
          onDelete={handleDeleteStaff}
          onClose={() => setShowStaffPopup(false)}
        />
      </PopupWrapper>
    </>
  );
}
