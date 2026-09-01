import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import {
  useDeletePostEventMedia,
  useHostPostEventContent,
  usePublishPostEventContent,
  useUnpublishPostEventContent,
  useUpdateThankYouMessage,
  useUploadPostEventMedia,
  createPostEventAttemptId,
} from "../../hooks/postEvent";
import ThankYouMessageSection from "../../components/host/post-event/ThankYouMessageSection";
import ContentSummary from "../../components/host/post-event/ContentSummary";
import MediaUploader from "../../components/host/post-event/MediaUploader";
import MessagingTemplatePicker from "../../components/host/post-event/MessagingTemplatePicker";
import AccessLinksSheet from "../../components/host/post-event/AccessLinksSheet";
import PublishControls from "../../components/host/post-event/PublishControls";
import LegalLinks from "../../components/legal/LegalLinks";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import LocalizedText from "../../components/commen/LocalizedText";
import AdaptiveText from "../../components/commen/AdaptiveText";
import KeyboardAwareFormScrollView from "../../components/commen/keyboard/KeyboardAwareFormScrollView";
import { formatCount } from "@halaa/shared/utils/locale";
import { layout } from "../../styles/tokens";

const StatusBanner = ({ isPublished, t }) => (
  <View
    style={[
      styles.statusBanner,
      isPublished ? styles.publishedBanner : styles.draftBanner,
    ]}
  >
    {/* Status glyph is semantic, not directional — never mirrored. */}
    <Ionicons
      name={isPublished ? "checkmark-circle" : "time-outline"}
      size={16}
      color={isPublished ? "#2A8C5B" : "#C28E5C"}
    />
    <LocalizedText
      style={[
        styles.statusText,
        { color: isPublished ? "#2A8C5B" : "#C28E5C" },
      ]}
    >
      {isPublished
        ? t("hostPostEvent.status.published")
        : t("hostPostEvent.status.draft")}
    </LocalizedText>
  </View>
);

const ManagePostEventScreen = ({ navigation, route }) => {
  const { eventId } = route.params || {};
  const { t, currentLanguage } = useTranslation("postEvent");
  const toast = useToast();

  const contentQuery = useHostPostEventContent(eventId);
  const upload = useUploadPostEventMedia();
  const removeMedia = useDeletePostEventMedia();
  const saveThankYou = useUpdateThankYouMessage();
  const publish = usePublishPostEventContent();
  const unpublish = useUnpublishPostEventContent();

  const content = contentQuery.data?.data || contentQuery.data || null;
  const media = Array.isArray(content?.media) ? content.media : [];
  const isPublished = content?.settings?.isPublished === true;
  const savedTemplateRef = content?.taqnyatTemplate?.templateRef || null;

  const [thankYouMessage, setThankYouMessage] = useState("");
  const [messageSaved, setMessageSaved] = useState(false);
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  const [publishAudience, setPublishAudience] = useState("attended");

  useEffect(() => {
    if (content?.thankYouMessage?.text !== undefined) {
      setThankYouMessage(content.thankYouMessage.text || "");
    } else if (content?.title !== undefined) {
      setThankYouMessage(content.title || "");
    }
  }, [content?.thankYouMessage?.text, content?.title]);

  const handlePickFiles = (formData) => {
    upload.mutate(
      { eventId, formData },
      {
        onError: (err) =>
          toast.error(err?.message || t("host.errors.uploadFailed")),
      }
    );
  };

  const handleDeleteMedia = (mediaId) => {
    Alert.alert(t("host.media.deleteTitle"), t("host.media.deleteConfirm"), [
      { text: t("host.media.cancel"), style: "cancel" },
      {
        text: t("host.media.delete"),
        style: "destructive",
        onPress: () => {
          setDeletingMediaId(mediaId);
          removeMedia.mutate(
            { eventId, mediaId },
            {
              onError: (err) =>
                toast.error(err?.message || t("host.errors.deleteFailed")),
              onSettled: () => setDeletingMediaId(null),
            }
          );
        },
      },
    ]);
  };

  const handleSaveMessage = () => {
    saveThankYou.mutate(
      { eventId, body: { text: thankYouMessage } },
      {
        onSuccess: () => {
          setMessageSaved(true);
          setTimeout(() => setMessageSaved(false), 2000);
          toast.success(t("host.thankYouMessage.saveSuccess"));
        },
        onError: (err) =>
          toast.error(err?.message || t("host.errors.saveFailed")),
      }
    );
  };

  const handlePublish = () => {
    Alert.alert(
      t("host.publishConfirmTitle"),
      t("host.publishConfirmMessage"),
      [
        { text: t("host.media.cancel"), style: "cancel" },
        {
          text: t("host.publish"),
          onPress: () =>
            publish.mutate(
              {
                eventId,
                body: { filter: publishAudience },
                attemptId: createPostEventAttemptId("publish-notify"),
              },
              {
                onSuccess: (response) => {
                  const summary = response?.data || {};
                  const breakdown = summary.channelBreakdown || {};
                  toast.success(t("host.publishSuccess"));
                  if (
                    (breakdown.whatsapp ?? 0) +
                      (breakdown.sms ?? 0) +
                      (breakdown.failed ?? 0) >
                    0
                  ) {
                    toast.info(
                      t("host.accessLinks.channelBreakdown", {
                        whatsapp: formatCount(breakdown.whatsapp || 0, currentLanguage),
                        sms: formatCount(breakdown.sms || 0, currentLanguage),
                        failed: formatCount(breakdown.failed || 0, currentLanguage),
                      })
                    );
                  }
                },
                onError: (err) =>
                  toast.error(err?.message || t("host.errors.publishFailed")),
              }
            ),
        },
      ]
    );
  };

  const handleUnpublish = () => {
    Alert.alert(
      t("host.unpublishConfirmTitle"),
      t("host.unpublishConfirmMessage"),
      [
        { text: t("host.media.cancel"), style: "cancel" },
        {
          text: t("host.unpublish"),
          style: "destructive",
          onPress: () =>
            unpublish.mutate(
              { eventId },
              {
                onSuccess: () => toast.success(t("host.unpublishSuccess")),
                onError: (err) =>
                  toast.error(err?.message || t("host.errors.publishFailed")),
              }
            ),
        },
      ]
    );
  };

  if (contentQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (contentQuery.isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          {/* Backend error text is arbitrary content — adaptive first-strong
              direction; the localized retry label below stays locale-driven. */}
          <AdaptiveText style={styles.errorText}>
            {contentQuery.error?.message ||
              t("hostPostEvent.errors.loadFailed")}
          </AdaptiveText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => contentQuery.refetch()}
          >
            <LocalizedText style={styles.retryText}>
              {t("hostPostEvent.errors.retry")}
            </LocalizedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", { defaultValue: "Back" })}
        >
          {/* Back arrow is a directional navigation glyph — flips with locale. */}
          <DirectionalIonicon name="arrow-back" size={20} color="#F9F4EF" />
        </TouchableOpacity>
        <LocalizedText style={styles.headerTitle}>{t("host.title")}</LocalizedText>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAwareFormScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={contentQuery.isRefetching}
            onRefresh={() => contentQuery.refetch()}
            tintColor="#C28E5C"
          />
        }
      >
        <StatusBanner isPublished={isPublished} t={t} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LocalizedText style={styles.sectionTitle}>
              {t("hostPostEvent.photos.title")}
            </LocalizedText>
          </View>
          <MediaUploader
            media={media}
            uploading={upload.isPending}
            deletingMediaId={deletingMediaId}
            onPickFiles={handlePickFiles}
            onDeleteMedia={handleDeleteMedia}
            t={t}
          />
        </View>

        <ThankYouMessageSection
          message={thankYouMessage}
          onChangeMessage={setThankYouMessage}
          onSave={handleSaveMessage}
          saving={saveThankYou.isPending}
          saved={messageSaved}
          t={t}
        />

        <MessagingTemplatePicker
          eventId={eventId}
          selectedTemplateRef={savedTemplateRef}
          t={t}
          toast={toast}
        />

        <ContentSummary media={media} content={content} t={t} />

        {!isPublished && (
          <View style={styles.section}>
            <LocalizedText style={styles.sectionTitle}>
              {t("host.accessLinks.filterLabel")}
            </LocalizedText>
            <View style={styles.audienceRow}>
              {["attended", "confirmed", "all"].map((audience) => (
                <TouchableOpacity
                  key={audience}
                  style={[
                    styles.audienceChip,
                    publishAudience === audience && styles.audienceChipActive,
                  ]}
                  onPress={() => setPublishAudience(audience)}
                  disabled={publish.isPending}
                >
                  <LocalizedText
                    style={[
                      styles.audienceText,
                      publishAudience === audience && styles.audienceTextActive,
                    ]}
                  >
                    {t(
                      `host.accessLinks.filter${audience.charAt(0).toUpperCase()}${audience.slice(1)}`
                    )}
                  </LocalizedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <PublishControls
          isPublished={isPublished}
          publishing={publish.isPending}
          unpublishing={unpublish.isPending}
          onPublish={handlePublish}
          onOpenAccessLinks={() => setAccessSheetOpen(true)}
          onUnpublish={handleUnpublish}
          t={t}
        />

        {/* UGC disclosure at the acceptance point (§4.3): publishing records
            acceptance of the current Terms + Community Rules. */}
        <LegalLinks
          noticeKey="legal.ugcAcceptNotice"
          docTypes={["terms", "community-rules"]}
        />

      </KeyboardAwareFormScrollView>

      <AccessLinksSheet
        visible={accessSheetOpen}
        onClose={() => setAccessSheetOpen(false)}
        eventId={eventId}
        savedTemplateRef={savedTemplateRef}
        t={t}
        toast={toast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  header: {
    backgroundColor: "#C28E5C", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", color: "#FFF" },
  headerRight: { width: 36 },
  centered: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#F9F4EF", gap: 12,
  },
  errorText: {
    fontSize: 14, fontFamily: "Cairo_400Regular", color: "#C28E5C",
    textAlign: "center", paddingHorizontal: 24,
  },
  retryButton: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: "#C28E5C", borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
  scroll: { flex: 1, backgroundColor: "#F9F4EF" },
  scrollContent: { padding: 16, paddingBottom: layout.dashboardPageBottom, gap: 16 },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 8, borderWidth: 1,
  },
  publishedBanner: { backgroundColor: "#EAF4EF", borderColor: "#B2D8C4" },
  draftBanner: { backgroundColor: "#FDF6EE", borderColor: "#E8D4C4" },
  statusText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", flex: 1 },
  section: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  audienceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  audienceChip: {
    borderWidth: 1, borderColor: "#D8C9BB", borderRadius: 18,
    paddingVertical: 7, paddingHorizontal: 12, backgroundColor: "#FFF",
  },
  audienceChipActive: { borderColor: "#C28E5C", backgroundColor: "#FDF6EE" },
  audienceText: { fontSize: 12, fontFamily: "Cairo_500Medium", color: "#5C5148" },
  audienceTextActive: { color: "#9B6D3F", fontFamily: "Cairo_700Bold" },
});

export default ManagePostEventScreen;
