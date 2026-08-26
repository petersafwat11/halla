import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import KeyboardAwareListScrollComponent from "../../components/commen/keyboard/KeyboardAwareListScrollComponent";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import {
  usePostEventContent,
  useValidatePostEventToken,
} from "../../hooks/postEvent";
import PostCard from "../../components/host/post-event/post-card/PostCard";
import GuestEventHeader from "../../components/host/post-event/GuestEventHeader";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import AdaptiveText from "../../components/commen/AdaptiveText";
import { layout } from "../../styles/tokens";

const _resolveQrErrorKey = (error) => {
  const reason = error?.data?.body?.reason || error?.data?.reason;
  switch (reason) {
    case "qr_rotated":
      return "errors.qrRotated";
    case "qr_revoked":
      return "errors.qrRevoked";
    case "qr_expired":
      return "errors.qrExpired";
    case "qr_lookup":
    case "qr_lookup_miss":
      return "errors.qrLookup";
    default:
      return "errors.qrInvalid";
  }
};

export default function PostEventScreen({ navigation, route }) {
  const { t } = useTranslation("postEvent");
  const toast = useToast();
  const { token: accessToken } = route?.params || {};

  const validateQuery = useValidatePostEventToken(accessToken);
  const validation = validateQuery.data?.data || validateQuery.data || {};
  const sessionToken = validation?.sessionToken || null;
  const guestInfo = validation?.guest || null;
  const eventInfo = validation?.event || null;
  const eventId = eventInfo?._id || eventInfo?.id || null;

  const contentQuery = usePostEventContent(eventId, sessionToken);
  const contentPayload =
    contentQuery.data?.data || contentQuery.data || {};

  const posts = useMemo(() => {
    const media = Array.isArray(contentPayload.media)
      ? contentPayload.media
      : [];
    return media
      .filter((m) => m.isPublished !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [contentPayload.media]);

  const thankYouMessage = contentPayload.thankYouMessage || {
    text: contentPayload.title,
    textAr: contentPayload.titleAr,
  };

  const [errorKey, setErrorKey] = useState(null);
  useEffect(() => {
    if (!accessToken) {
      setErrorKey("errors.qrInvalid");
      return;
    }
    if (validateQuery.isError) {
      setErrorKey(_resolveQrErrorKey(validateQuery.error));
      return;
    }
    if (validateQuery.data && (validation?.valid === false || !sessionToken)) {
      setErrorKey("errors.qrInvalid");
      return;
    }
    setErrorKey(null);
  }, [
    accessToken,
    validateQuery.isError,
    validateQuery.error,
    validateQuery.data,
    sessionToken,
    validation?.valid,
  ]);

  const handleBack = () => {
    if (navigation?.canGoBack()) navigation.goBack();
  };

  const isValidating = validateQuery.isLoading;
  const isLoadingContent =
    !!sessionToken && contentQuery.isLoading && !contentQuery.data;

  if (isValidating || isLoadingContent) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#c28e5c" />
          <Text style={styles.loadingText}>
            {isValidating ? t("validating") : t("loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorKey) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#c28e5c" />
          <Text style={styles.invalidTitle}>{t("accessDenied")}</Text>
          <Text style={styles.invalidDesc}>{t(errorKey)}</Text>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>{t("buttons.back")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.topBarBack}
              activeOpacity={0.7}
            >
              <DirectionalIonicon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {/* Backend event title is arbitrary content — first-strong base
              direction, centred per the bar design. */}
          <AdaptiveText style={styles.topBarTitle} numberOfLines={1}>
            {eventInfo?.title || t("postEventFallback")}
          </AdaptiveText>
          <View style={{ width: 44 }} />
        </View>

        {/* Aware-list adapter (§8.2 post-event row): the FlatList keeps its
            virtualization while the keyboard-controller's aware scroll
            component reveals whichever composer input gains focus. */}
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id?.toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              eventId={eventId}
              sessionToken={sessionToken}
              t={t}
              toast={toast}
            />
          )}
          ListHeaderComponent={
            <GuestEventHeader
              eventInfo={eventInfo}
              guestInfo={guestInfo}
              thankYouMessage={thankYouMessage}
              postsCount={posts.length}
              t={t}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderScrollComponent={KeyboardAwareListScrollComponent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#c28e5c",
  },
  container: {
    flex: 1,
    backgroundColor: "#f9f4ef",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f4ef",
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    marginTop: 8,
  },
  invalidTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
  },
  invalidDesc: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#c28e5c",
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#c28e5c",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarBack: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  listContent: { paddingBottom: layout.dashboardPageBottom },
});
