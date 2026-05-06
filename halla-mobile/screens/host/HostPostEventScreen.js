import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../localization";
import {
  getHostPostEventContent, uploadPostEventPhotos, updateThankYouMessage,
  deletePostEventPhoto, publishPostEventContent, generatePostEventTokens,
} from "../../services/hostPostEventService";
import PhotoGrid, { EmptyPhotoPlaceholder } from "../../components/host/post-event/PhotoGrid";
import ThankYouMessageSection from "../../components/host/post-event/ThankYouMessageSection";
import ContentSummary from "../../components/host/post-event/ContentSummary";
import ActionButtons from "../../components/host/post-event/ActionButtons";

const HostPostEventScreen = ({ navigation, route }) => {
  const { eventId } = route.params || {};
  const { token } = useAuthStore();
  const { t } = useTranslation("postEvent");

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);
  const [messageSaved, setMessageSaved] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [resending, setResending] = useState(false);

  const fetchContent = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getHostPostEventContent(eventId, token);
      const c = data.data || data;
      setContent(c);
      setThankYouMessage(c.thankYouMessage?.text || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handlePickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("hostPostEvent.photos.permissionRequired"), t("hostPostEvent.photos.permissionMessage"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.8, selectionLimit: 20,
    });
    if (result.canceled || !result.assets?.length) return;
    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      result.assets.forEach((asset, index) => {
        formData.append("photos", {
          uri: asset.uri, name: asset.fileName || `photo_${index}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      });
      await uploadPostEventPhotos(eventId, formData, token);
      await fetchContent();
    } catch (err) {
      Alert.alert(t("common.error", "خطأ"), err.message || t("hostPostEvent.errors.uploadFailed"));
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = (photoId) => {
    Alert.alert(t("hostPostEvent.photos.deleteTitle"), t("hostPostEvent.photos.deleteConfirm"), [
      { text: t("hostPostEvent.photos.cancel"), style: "cancel" },
      {
        text: t("hostPostEvent.photos.delete"), style: "destructive",
        onPress: async () => {
          try {
            setDeletingPhotoId(photoId);
            await deletePostEventPhoto(eventId, photoId, token);
            await fetchContent();
          } catch (err) {
            Alert.alert(t("common.error", "خطأ"), err.message || t("hostPostEvent.errors.deleteFailed"));
          } finally {
            setDeletingPhotoId(null);
          }
        },
      },
    ]);
  };

  const handleSaveMessage = async () => {
    try {
      setSavingMessage(true);
      await updateThankYouMessage(eventId, thankYouMessage, token);
      setMessageSaved(true);
      setTimeout(() => setMessageSaved(false), 2000);
    } catch (err) {
      Alert.alert(t("common.error", "خطأ"), err.message || t("hostPostEvent.errors.saveFailed"));
    } finally {
      setSavingMessage(false);
    }
  };

  const handlePublish = () => {
    Alert.alert(t("hostPostEvent.actions.publish"), t("hostPostEvent.actions.publishConfirm"), [
      { text: t("hostPostEvent.actions.cancel"), style: "cancel" },
      {
        text: t("hostPostEvent.actions.publishAction"),
        onPress: async () => {
          try {
            setPublishing(true);
            await publishPostEventContent(eventId, token);
            await fetchContent();
            Alert.alert(t("hostPostEvent.actions.publishSuccess"));
          } catch (err) {
            Alert.alert(t("common.error", "خطأ"), err.message || t("hostPostEvent.errors.publishFailed"));
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  };

  const handleResend = () => {
    Alert.alert(t("hostPostEvent.actions.resend"), t("hostPostEvent.actions.resendConfirm"), [
      { text: t("hostPostEvent.actions.cancel"), style: "cancel" },
      {
        text: t("hostPostEvent.actions.resendAction"),
        onPress: async () => {
          try {
            setResending(true);
            const result = await generatePostEventTokens(eventId, "attended", token);
            const sent = result?.summary?.generated || result?.data?.summary?.generated
              || result?.tokens?.length || result?.data?.tokens?.length || 0;
            Alert.alert(t("hostPostEvent.actions.publishSuccess"), t("hostPostEvent.actions.resendSuccess", { count: sent }));
          } catch (err) {
            Alert.alert(t("common.error", "خطأ"), err.message || t("hostPostEvent.errors.resendFailed"));
          } finally {
            setResending(false);
          }
        },
      },
    ]);
  };

  const isPublished = content?.settings?.isPublished === true;
  const photos = content?.posts?.filter((p) => p.type === "photo") || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F9F4EF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("hostPostEvent.title", "صفحة ما بعد المناسبة")}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#C28E5C" /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchContent}>
            <Text style={styles.retryText}>{t("hostPostEvent.errors.retry", "إعادة المحاولة")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, isPublished ? styles.publishedBanner : styles.draftBanner]}>
            <Ionicons
              name={isPublished ? "checkmark-circle" : "time-outline"}
              size={16} color={isPublished ? "#2A8C5B" : "#C28E5C"}
            />
            <Text style={[styles.statusText, { color: isPublished ? "#2A8C5B" : "#C28E5C" }]}>
              {isPublished ? t("hostPostEvent.status.published") : t("hostPostEvent.status.draft")}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("hostPostEvent.photos.title", "الصور")}</Text>
              <TouchableOpacity style={styles.addButton} onPress={handlePickPhotos} disabled={uploadingPhotos} activeOpacity={0.7}>
                {uploadingPhotos ? (
                  <ActivityIndicator size={14} color="#FFF" />
                ) : (
                  <Ionicons name="add" size={14} color="#FFF" />
                )}
                <Text style={styles.addButtonText}>
                  {uploadingPhotos ? t("hostPostEvent.photos.uploading") : t("hostPostEvent.photos.add")}
                </Text>
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              <EmptyPhotoPlaceholder onPress={handlePickPhotos} disabled={uploadingPhotos} />
            ) : (
              <PhotoGrid photos={photos} deletingPhotoId={deletingPhotoId} onDeletePhoto={handleDeletePhoto} />
            )}
          </View>

          <ThankYouMessageSection
            message={thankYouMessage} onChangeMessage={setThankYouMessage}
            onSave={handleSaveMessage} saving={savingMessage} saved={messageSaved} t={t}
          />

          <ContentSummary photos={photos} content={content} t={t} />

          <ActionButtons
            isPublished={isPublished} publishing={publishing} resending={resending}
            onPublish={handlePublish} onResend={handleResend} t={t}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9F4EF", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#C28E5C", textAlign: "center", paddingHorizontal: 24 },
  retryButton: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: "#C28E5C", borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
  scroll: { flex: 1, backgroundColor: "#F9F4EF" },
  scrollContent: { padding: 16, gap: 16 },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 8, borderWidth: 1,
  },
  publishedBanner: { backgroundColor: "#EAF4EF", borderColor: "#B2D8C4" },
  draftBanner: { backgroundColor: "#FDF6EE", borderColor: "#E8D4C4" },
  statusText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", flex: 1, textAlign: "right" },
  section: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  addButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#C28E5C",
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6,
  },
  addButtonText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});

export default HostPostEventScreen;
