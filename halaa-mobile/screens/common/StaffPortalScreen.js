/**
 * Staff Portal Screen
 * Allows event staff to log in with phone + eventId, view the guest list,
 * check in guests (by tap or QR code text), and see real-time stats.
 *
 * Auth: Uses its own staff session JWT (stored in AsyncStorage), NOT the user's Bearer token.
 * Accessible from AuthStack — no main app login required.
 */

import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { clearStaffToken } from "../../services/secureStorage";
import LoginView from "../../components/common/staff-portal/LoginView";
import PortalView from "../../components/common/staff-portal/PortalView";

export default function StaffPortalScreen() {
  const { t } = useTranslation("staff");
  const [staffInfo, setStaffInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventId, setEventId] = useState(null);

  const handleVerified = (result) => {
    setStaffInfo(result.staff);
    setEventInfo(result.event);
    setEventId(result.event?._id);
  };

  const handleLogout = () => {
    Alert.alert(
      t("portal.logout"),
      "",
      [
        { text: t("checkIn.cancel"), style: "cancel" },
        {
          text: t("portal.logout"),
          style: "destructive",
          onPress: async () => {
            await clearStaffToken();
            setStaffInfo(null);
            setEventInfo(null);
            setEventId(null);
          },
        },
      ]
    );
  };

  const isAuthenticated = !!staffInfo && !!eventId;

  return (
    <SafeAreaView style={styles.screen}>
      {isAuthenticated ? (
        <PortalView
          staffInfo={staffInfo}
          eventInfo={eventInfo}
          eventId={eventId}
          onLogout={handleLogout}
          t={t}
        />
      ) : (
        <LoginView onVerified={handleVerified} t={t} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
});
