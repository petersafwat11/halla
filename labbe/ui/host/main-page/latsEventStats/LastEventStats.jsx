"use client";
import React, { useState } from "react";
import styles from "./LastEventStats.module.css";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import TestMessagePopup from "../TestMessagePopup";
import ScheduleSendingPopup from "@/ui/host/popups/scheduleSendingPopup/ScheduleSendingPopup";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useHostDashboard } from "@/hooks/reactQueryHooks/useDashboard";
import LastEventHeader from "./_components/LastEventHeader";
import LastEventResponseStats from "./_components/LastEventResponseStats";
import LastEventQuota from "./_components/LastEventQuota";
import LastEventActions from "./_components/LastEventActions";

const Divider = () => (
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
);

function LastEventStats() {
  const isMobile = useMediaQuery("(max-width: 550px)");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [showTestMessagePopup, setShowTestMessagePopup] = useState(false);

  const { data: responseData, isLoading } = useHostDashboard();
  const actualData = responseData?.data;
  const event = actualData?.lastEvent;
  const subscription = actualData?.subscription;

  const data = event || {};
  const [testMessageSent, setTestMessageSent] = useState(
    data.testMessageSent || false,
  );

  // Backend dual-writes both `taqnyatTemplate` and legacy `invitationSettings`
  // until consumers finish migrating; accept either as proof of a template.
  const hasTemplate =
    !!data.taqnyatTemplate?.templateRef ||
    !!data.invitationSettings?.selectedTemplate?.name;
  const canSendTest = hasTemplate && !testMessageSent;
  const canSchedule = hasTemplate && testMessageSent;

  if (isLoading) return <SimpleLoading />;
  if (!data?.id) return null;

  const handleTestMessageSuccess = () => {
    setTestMessageSent(true);
    setShowTestMessagePopup(false);
    router.refresh();
  };

  return (
    <div className={styles.eventCard}>
      <LastEventHeader
        event={data}
        isMobile={isMobile}
        currentLocale={currentLocale}
      />

      {!isMobile && <Divider />}

      <LastEventResponseStats event={data} isMobile={isMobile} />

      {!isMobile && <Divider />}

      {subscription && (
        <>
          <LastEventQuota quota={data.quota} />
          {!isMobile && <Divider />}
        </>
      )}

      <LastEventActions
        event={data}
        isMobile={isMobile}
        canSendTest={canSendTest}
        canSchedule={canSchedule}
        currentLocale={currentLocale}
        onTestMessage={() => setShowTestMessagePopup(true)}
        onScheduleSending={() => setShowSchedulePopup(true)}
      />

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
