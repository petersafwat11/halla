"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import styles from "./actions.module.css";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import MakeTicketPopup from "@/ui/admin/dashboard/makeTicketPopup/MakeTicketPopup";
import AddModeratorPopup from "@/app/[lang]/admin-dash/moderators/_components/addModeratorPopup/AddModeratorPopup";

const Actions = () => {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const [showTicketPopup, setShowTicketPopup] = useState(false);
  const [showModeratorPopup, setShowModeratorPopup] = useState(false);

  const handleTicketSuccess = () => {
    console.log("Ticket created successfully");
  };

  const handleModeratorSuccess = () => {
    console.log("Moderator added successfully");
  };

  const handleCreateEvent = () => {
    router.push("/admin-dash/create-event");
  };

  return (
    <>
      <div className={styles.actions}>
        <button className={styles.action} onClick={handleCreateEvent}>
          <Image
            src="/svg/admin/calendar-add.svg"
            alt="calendar"
            width={20}
            height={20}
          />
          {t("actions.createEvent", "إنشاء مناسبة")}
        </button>
        <button
          className={styles.action}
          onClick={() => setShowModeratorPopup(true)}
        >
          <Image
            src="/svg/admin/people-2.svg"
            alt="add moderator"
            width={20}
            height={20}
          />
          {t("actions.addModerator", "إضافة مشرف")}
        </button>
        <button
          className={styles.action}
          onClick={() => setShowTicketPopup(true)}
        >
          <Image
            src="/svg/admin/people-2.svg"
            alt="create ticket"
            width={20}
            height={20}
          />
          {t("actions.createTicket", "إنشاء شكوى")}
        </button>
      </div>

      {/* Ticket Popup */}
      <PopupLayout
        isOpen={showTicketPopup}
        onClose={() => setShowTicketPopup(false)}
        size="auto"
      >
        <MakeTicketPopup
          onClose={() => setShowTicketPopup(false)}
          onSuccess={handleTicketSuccess}
        />
      </PopupLayout>

      {/* Moderator Popup */}
      <PopupLayout
        isOpen={showModeratorPopup}
        onClose={() => setShowModeratorPopup(false)}
      >
        <AddModeratorPopup
          onClose={() => setShowModeratorPopup(false)}
          onSuccess={handleModeratorSuccess}
        />
      </PopupLayout>
    </>
  );
};

export default Actions;
