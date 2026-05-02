import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../stores/authStore";
import {
  getHostPostEventContent,
  uploadPostEventPhotos,
  updateThankYouMessage,
  deletePostEventPhoto,
  publishPostEventContent,
  generatePostEventTokens,
} from "../services/hostPostEventService";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 12) / 3; // 3 columns, 24px padding each side, 12px gaps

const HostPostEventScreen = ({ navigation, route }) => {
  const { eventId } = route.params || {};
  const { token } = useAuthStore();

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
      setThankYouMessage(c.thankYouMessage || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handlePickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مطلوب", "يرجى السماح بالوصول إلى المعرض لرفع الصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20,
    });

    if (result.canceled || !result.assets?.length) return;

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      result.assets.forEach((asset, index) => {
        const fileName = asset.fileName || `photo_${index}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";
        formData.append("photos", {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
      });
      await uploadPostEventPhotos(eventId, formData, token);
      await fetchContent();
    } catch (err) {
      Alert.alert("خطأ", err.message || "فشل رفع الصور");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = (photoId) => {
    Alert.alert("حذف الصورة", "هل تريد حذف هذه الصورة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingPhotoId(photoId);
            await deletePostEventPhoto(eventId, photoId, token);
            await fetchContent();
          } catch (err) {
            Alert.alert("خطأ", err.message || "فشل حذف الصورة");
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
      Alert.alert("خطأ", err.message || "فشل حفظ الرسالة");
    } finally {
      setSavingMessage(false);
    }
  };

  const handlePublish = () => {
    Alert.alert(
      "نشر المحتوى",
      "سيتم إرسال روابط الوصول لجميع الضيوف الذين حضروا المناسبة. هل تريد المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "نشر",
          onPress: async () => {
            try {
              setPublishing(true);
              await publishPostEventContent(eventId, token);
              await fetchContent();
              Alert.alert("تم النشر", "تم نشر المحتوى وإرسال الروابط للضيوف بنجاح");
            } catch (err) {
              Alert.alert("خطأ", err.message || "فشل النشر");
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  const handleResend = () => {
    Alert.alert(
      "إعادة الإرسال",
      "سيتم إعادة إرسال روابط الوصول للضيوف. هل تريد المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إرسال",
          onPress: async () => {
            try {
              setResending(true);
              const result = await generatePostEventTokens(eventId, "attended", token);
              const sent = result?.sent || result?.data?.sent || 0;
              Alert.alert("تم الإرسال", `تم إرسال الروابط لـ ${sent} ضيف`);
            } catch (err) {
              Alert.alert("خطأ", err.message || "فشل إعادة الإرسال");
            } finally {
              setResending(false);
            }
          },
        },
      ]
    );
  };

  const isPublished = content?.settings?.isPublished === true;
  const photos = content?.posts?.filter((p) => p.type === "photo") || [];

  const renderPhoto = ({ item }) => (
    <View style={styles.photoWrapper}>
      <Image source={{ uri: item.content?.url || item.url }} style={styles.photo} />
      <TouchableOpacity
        style={styles.deletePhotoBtn}
        onPress={() => handleDeletePhoto(item._id)}
        disabled={deletingPhotoId === item._id}
      >
        {deletingPhotoId === item._id ? (
          <ActivityIndicator size={12} color="#FFF" />
        ) : (
          <Ionicons name="close" size={12} color="#FFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#F9F4EF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>صفحة ما بعد المناسبة</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchContent}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Banner */}
          <View style={[styles.statusBanner, isPublished ? styles.publishedBanner : styles.draftBanner]}>
            <Ionicons
              name={isPublished ? "checkmark-circle" : "time-outline"}
              size={16}
              color={isPublished ? "#2A8C5B" : "#C28E5C"}
            />
            <Text style={[styles.statusText, { color: isPublished ? "#2A8C5B" : "#C28E5C" }]}>
              {isPublished ? "تم النشر — الضيوف يمكنهم الوصول للمحتوى" : "مسودة — لم يتم النشر بعد"}
            </Text>
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الصور</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handlePickPhotos}
                disabled={uploadingPhotos}
                activeOpacity={0.7}
              >
                {uploadingPhotos ? (
                  <ActivityIndicator size={14} color="#FFF" />
                ) : (
                  <Ionicons name="add" size={14} color="#FFF" />
                )}
                <Text style={styles.addButtonText}>
                  {uploadingPhotos ? "جاري الرفع..." : "إضافة صور"}
                </Text>
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyPhotos}
                onPress={handlePickPhotos}
                disabled={uploadingPhotos}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={36} color="#C28E5C" />
                <Text style={styles.emptyPhotosText}>اضغط لإضافة صور المناسبة</Text>
              </TouchableOpacity>
            ) : (
              <FlatList
                data={photos}
                renderItem={renderPhoto}
                keyExtractor={(item) => item._id}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={styles.photoRow}
              />
            )}
          </View>

          {/* Thank You Message Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>رسالة الشكر</Text>
            <TextInput
              style={styles.messageInput}
              value={thankYouMessage}
              onChangeText={setThankYouMessage}
              multiline
              numberOfLines={4}
              placeholder="اكتب رسالة شكر للضيوف..."
              placeholderTextColor="#B0B0B0"
              textAlign="right"
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveButton, messageSaved && styles.savedButton]}
              onPress={handleSaveMessage}
              disabled={savingMessage}
              activeOpacity={0.7}
            >
              {savingMessage ? (
                <ActivityIndicator size={14} color="#FFF" />
              ) : (
                <Ionicons
                  name={messageSaved ? "checkmark" : "save-outline"}
                  size={14}
                  color="#FFF"
                />
              )}
              <Text style={styles.saveButtonText}>
                {savingMessage ? "جاري الحفظ..." : messageSaved ? "تم الحفظ" : "حفظ الرسالة"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملخص المحتوى</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{photos.length}</Text>
                <Text style={styles.summaryLabel}>صورة</Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {content?.posts?.filter((p) => p.type === "video")?.length || 0}
                </Text>
                <Text style={styles.summaryLabel}>فيديو</Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {content?.posts?.reduce((acc, p) => acc + (p.commentsCount || 0), 0) || 0}
                </Text>
                <Text style={styles.summaryLabel}>تعليق</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {!isPublished ? (
              <TouchableOpacity
                style={[styles.publishButton, publishing && styles.disabledButton]}
                onPress={handlePublish}
                disabled={publishing}
                activeOpacity={0.7}
              >
                {publishing ? (
                  <ActivityIndicator size={16} color="#FFF" />
                ) : (
                  <Ionicons name="send-outline" size={16} color="#FFF" />
                )}
                <Text style={styles.publishButtonText}>
                  {publishing ? "جاري النشر..." : "نشر وإرسال للضيوف"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.resendButton, resending && styles.disabledButton]}
                onPress={handleResend}
                disabled={resending}
                activeOpacity={0.7}
              >
                {resending ? (
                  <ActivityIndicator size={16} color="#C28E5C" />
                ) : (
                  <Ionicons name="refresh-outline" size={16} color="#C28E5C" />
                )}
                <Text style={styles.resendButtonText}>
                  {resending ? "جاري الإرسال..." : "إعادة إرسال الروابط"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  header: {
    backgroundColor: "#C28E5C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  headerRight: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#C28E5C",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#C28E5C",
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  publishedBanner: {
    backgroundColor: "#EAF4EF",
    borderColor: "#B2D8C4",
  },
  draftBanner: {
    backgroundColor: "#FDF6EE",
    borderColor: "#E8D4C4",
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  emptyPhotos: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    borderStyle: "dashed",
    gap: 8,
  },
  emptyPhotosText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#C28E5C",
  },
  photoRow: {
    gap: 6,
    marginBottom: 6,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  deletePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#E0D5CC",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    backgroundColor: "#F9F4EF",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    borderRadius: 8,
  },
  savedButton: {
    backgroundColor: "#2A8C5B",
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  summarySep: {
    width: 1,
    height: 32,
    backgroundColor: "#E8D4C4",
  },
  actionsSection: {
    gap: 10,
  },
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
  },
  publishButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C28E5C",
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default HostPostEventScreen;
