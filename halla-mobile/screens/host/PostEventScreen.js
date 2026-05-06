import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { validatePostEventToken, getPostEventContent } from "../../services/postEventService";
import PostCard from "../../components/host/post-event/PostCard";

export default function PostEventScreen({ navigation, route }) {
  const { t, i18n } = useTranslation("postEvent");
  const toast = useToast();
  const isArabic = i18n.language === "ar";
  const { token: accessToken } = route?.params || {};

  const [stage, setStage] = useState("validating");
  const [sessionToken, setSessionToken] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [thankYouMessage, setThankYouMessage] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setStage("invalid");
      return;
    }
    handleValidate();
  }, [accessToken]);

  const handleValidate = async () => {
    setStage("validating");
    try {
      const result = await validatePostEventToken(accessToken);
      const { valid, guest, event, sessionToken: sToken } = result?.data || result || {};
      if (!valid || !sToken) {
        setStage("invalid");
        return;
      }
      setSessionToken(sToken);
      setGuestInfo(guest);
      setEventInfo(event);
      await handleLoadContent(event?._id || event?.id, sToken);
    } catch {
      setStage("invalid");
    }
  };

  const handleLoadContent = async (evId, sToken) => {
    setStage("loading");
    try {
      const result = await getPostEventContent(evId, sToken);
      const payload = result?.data || result || {};
      const rawPosts = payload.posts || [];
      const published = rawPosts
        .filter((p) => p.isPublished !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setPosts(published);
      setThankYouMessage(payload.thankYouMessage);
      setStage("ready");
    } catch {
      setStage("ready");
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) navigation.goBack();
  };

  if (stage === "validating" || stage === "loading") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#c28e5c" />
          <Text style={styles.loadingText}>
            {stage === "validating" ? t("validating") : t("loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === "invalid") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#c28e5c" />
          <Text style={styles.invalidTitle}>{t("accessDenied")}</Text>
          <Text style={styles.invalidDesc}>{t("accessDeniedDesc")}</Text>
          {navigation?.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>{t("buttons.back")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <View>
      <View style={styles.eventHeader}>
        <View style={styles.eventHeaderIcon}>
          <Ionicons name="sparkles" size={28} color="#c28e5c" />
        </View>
        <View style={styles.eventHeaderText}>
          {eventInfo?.title && (
            <Text style={styles.eventTitle} numberOfLines={2}>
              {eventInfo.title}
            </Text>
          )}
          {guestInfo?.name && (
            <Text style={styles.guestName}>
              <Ionicons name="person" size={13} color="#a0a0a0" /> {guestInfo.name}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.thankYouCard}>
        <Ionicons name="heart" size={24} color="#e74c3c" style={styles.thankYouIcon} />
        <Text style={styles.thankYouTitle}>
          {thankYouMessage?.text || t("thankYou.defaultTitle")}
        </Text>
        {thankYouMessage?.textAr && (
          <Text style={styles.thankYouSubtitle}>{thankYouMessage.textAr}</Text>
        )}
      </View>

      {posts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#e0d5cc" />
          <Text style={styles.emptyTitle}>{t("noContent")}</Text>
          <Text style={styles.emptyDesc}>{t("noContentDesc")}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          {navigation?.canGoBack() && (
            <TouchableOpacity onPress={handleBack} style={styles.topBarBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>
            {eventInfo?.title || t("postEventFallback")}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <FlatList
            data={posts}
            keyExtractor={(item) => item._id?.toString()}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                eventId={eventInfo?._id || eventInfo?.id}
                sessionToken={sessionToken}
                guestId={guestInfo?._id}
                t={t}
                toast={toast}
              />
            )}
            ListHeaderComponent={<ListHeader />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </KeyboardAvoidingView>
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
  listContent: { paddingBottom: 32 },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 12,
    gap: 12,
  },
  eventHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
  },
  eventHeaderText: { flex: 1 },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    lineHeight: 26,
  },
  guestName: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
    marginTop: 2,
  },
  thankYouCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f5ece4",
  },
  thankYouIcon: { marginBottom: 8 },
  thankYouTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
    lineHeight: 26,
  },
  thankYouSubtitle: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginTop: 16,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
