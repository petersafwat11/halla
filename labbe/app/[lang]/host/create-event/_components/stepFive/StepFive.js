"use client";
/**
 * Step 5 of the create-event wizard: invitation messaging + auto-replies
 * + optional note.
 *
 * Form context contract (canonical / legacy keys are dual-written):
 *   - invitationMessage          (top-level)
 *   - guestReplies.onAttend      ⇄ attendanceAutoReply
 *   - guestReplies.onAbsent      ⇄ absenceAutoReply
 *   - guestReplies.onExpected    ⇄ expectedAttendanceAutoReply
 *   - hostNote                   ⇄ note
 */

import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepfive.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";

const AUTO_REPLIES_DEFAULTS = {
  attending:
    "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  maybe: "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  absence: "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
};

const REPLY_TABS = [
  { key: "attending", label: "الحضور", canonical: "onAttend", legacy: "attendanceAutoReply" },
  { key: "maybe", label: "ربما", canonical: "onExpected", legacy: "expectedAttendanceAutoReply" },
  { key: "absence", label: "الاعتذار", canonical: "onAbsent", legacy: "absenceAutoReply" },
];

const StepFive = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const [activeTab, setActiveTab] = useState("attending");

  const guestReplies = watch("guestReplies") || {};

  // Seed the canonical + legacy reply fields once (mirrors prior
  // behaviour where StepFour seeded these on mount).
  useEffect(() => {
    if (!watch("guestReplies.onAttend")) {
      setValue("guestReplies.onAttend", AUTO_REPLIES_DEFAULTS.attending, { shouldDirty: false });
      setValue("attendanceAutoReply", AUTO_REPLIES_DEFAULTS.attending, { shouldDirty: false });
    }
    if (!watch("guestReplies.onAbsent")) {
      setValue("guestReplies.onAbsent", AUTO_REPLIES_DEFAULTS.absence, { shouldDirty: false });
      setValue("absenceAutoReply", AUTO_REPLIES_DEFAULTS.absence, { shouldDirty: false });
    }
    if (!watch("guestReplies.onExpected")) {
      setValue("guestReplies.onExpected", AUTO_REPLIES_DEFAULTS.maybe, { shouldDirty: false });
      setValue("expectedAttendanceAutoReply", AUTO_REPLIES_DEFAULTS.maybe, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeReply = REPLY_TABS.find((tab) => tab.key === activeTab);
  const replyText = guestReplies?.[activeReply?.canonical];

  const handleReplyChange = (e) => {
    const value = e.target.value;
    if (!activeReply) return;
    setValue(`guestReplies.${activeReply.canonical}`, value, { shouldDirty: true });
    setValue(activeReply.legacy, value, { shouldDirty: true });
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setValue("hostNote", value, { shouldDirty: true });
    setValue("note", value, { shouldDirty: true });
  };

  return (
    <div className={styles.stepFive}>
      <div className={styles.formSection}>
        {/* ── Invitation message (host-supplied, optional) ───────── */}
        <div className={styles.field}>
          <label className={styles.sectionLabel}>
            {t("invitation_message_label", "نص الدعوة")}
          </label>
          <TextArea
            placeholder={t("invitation_message_placeholder", "اكتب نص الدعوة")}
            name="invitationMessage"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* ── Auto-replies tabs ──────────────────────────────────── */}
        <div className={styles.repliesSection}>
          <div className={styles.repliesHeader}>
            <label className={styles.sectionLabel}>
              {t("auto_replies", "الردود التلقائية")}
            </label>
            <p className={styles.repliesHint}>
              {t(
                "auto_replies_hint_editable",
                "تُرسل تلقائياً للضيف فور اختياره — يمكنك تعديل النص"
              )}
            </p>
          </div>

          <div className={styles.tabsWrapper}>
            {REPLY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <textarea
            value={replyText || ""}
            onChange={handleReplyChange}
            rows={4}
            maxLength={500}
            className={styles.replyTextarea}
            placeholder={t("auto_reply_placeholder", "اكتب الرد التلقائي هنا")}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              fontFamily: "inherit",
              fontSize: 14,
              direction: "rtl",
            }}
          />
        </div>

        {/* ── Optional host note ─────────────────────────────────── */}
        <div className={styles.optionalField}>
          <div className={styles.labelWithOptional}>
            <span className={styles.optionalText}>{t("optional", "(اختياري)")}</span>
            <label className={styles.label}>
              {t("add_note_label", "ملاحظة المضيف")}
            </label>
          </div>
          <InputGroup
            placeholder={t("add_note_placeholder", "اكتب ملاحظتك هنا")}
            name="hostNote"
            type="text"
            maxLength={300}
            onChange={handleNoteChange}
          />
        </div>
      </div>
    </div>
  );
};

export default StepFive;
