import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { LastEvent, MakeYourFirst } from "./";

const HeaderTexture = () => (
  <>
    <View style={styles.textureLeft}>
      <View style={styles.textureLine1} />
      <View style={styles.textureLine2} />
    </View>
    <View style={styles.textureRight}>
      <View style={styles.textureLine1} />
      <View style={styles.textureLine2} />
    </View>
  </>
);

const HomeHeaderContent = ({
  loading, error, hasEvents, event, subscription, isNotifyingStaff,
  onEditPress, onTestMessagePress, onViewStatsPress, onSchedulePress,
  onNotifyStaffPress, onPostEventPress, onCreateEventPress, onRetry, t,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F9F4EF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t("common.loadError", "خطأ في تحميل البيانات")}</Text>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>{t("common.retry", "إعادة المحاولة")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <HeaderTexture />
      {hasEvents ? (
        <LastEvent
          event={event}
          onEditPress={onEditPress}
          onTestMessagePress={onTestMessagePress}
          onViewStatsPress={onViewStatsPress}
          onSchedulePress={onSchedulePress}
          onNotifyStaffPress={onNotifyStaffPress}
          onPostEventPress={onPostEventPress}
          subscription={subscription}
          isNotifyingStaff={isNotifyingStaff}
        />
      ) : (
        <MakeYourFirst onCreatePress={onCreateEventPress} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  textureLeft: {
    position: "absolute", left: -190, top: -86, width: 460, height: 436, opacity: 0.8,
  },
  textureRight: {
    position: "absolute", right: -300, top: -86, width: 460, height: 436, opacity: 0.8,
  },
  textureLine1: {
    width: 470, height: 50, transform: [{ rotate: "129.229deg" }], opacity: 0.8,
    background: "radial-gradient(8420.27% 85.09% at 8.82% 45.53%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.00) 100%)",
    position: "absolute", top: 34,
  },
  textureLine2: {
    width: 495, height: 50, transform: [{ rotate: "129.229deg" }], opacity: 0.8,
    background: "radial-gradient(8420.27% 85.09% at 8.82% 45.53%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.00) 100%)",
    position: "absolute", left: 116, top: 0,
  },
  loadingContainer: { paddingVertical: 40, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    paddingVertical: 40, paddingHorizontal: 16, justifyContent: "center",
    alignItems: "center", backgroundColor: "#F9F4EF", borderRadius: 12, gap: 12,
  },
  errorText: {
    fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#C28E5C", textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#C28E5C", borderRadius: 8,
  },
  retryText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});

export default HomeHeaderContent;
