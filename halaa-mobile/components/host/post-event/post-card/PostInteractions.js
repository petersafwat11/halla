import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { buildPostEventMediaForm } from '../../../../utils/postEventMultipart';
import { getImageUrl } from '../../../../utils/imageUtils';
import TextInput from "../../../commen/DirectionalTextInput";
import AdaptiveText from "../../../commen/AdaptiveText";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { formatCount } from "@halaa/shared/utils/locale";
import {
  usePostEventComments,
  useAddPostEventComment,
  useTogglePostEventLike,
  useReportPostEventContent,
  useBlockPostEventActor,
} from "../../../../hooks/postEvent";
import { useTranslation } from "../../../../localization";
import LegalLinks from "../../../legal/LegalLinks";

const PostInteractions = ({ post, eventId, sessionToken, t, toast, readOnly = false, settings = {} }) => {
  const liked = !!post.userLiked;
  const likesCount = post.likesCount ?? post.likes?.length ?? 0;
  const commentsCount = post.commentsCount ?? post.comments?.length ?? 0;

  const [showComments, setShowComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [page, setPage] = useState(1);
  const [loadedComments, setLoadedComments] = useState([]);
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10 - attachments.length });
      if (!result.canceled) setAttachments(previous => [...previous, ...result.assets].slice(0, 10));
    } catch { toast?.error(t('comment.error')); }
  };

  const toggleLike = useTogglePostEventLike();
  const addComment = useAddPostEventComment();
  const reportContent = useReportPostEventContent();
  const blockActor = useBlockPostEventActor();

  // `t` arrives via props (postEvent namespace); the hook supplies the
  // active language for locale-formatted digits.
  const { currentLanguage } = useTranslation("postEvent");

  const submitReport = (c, reason) => {
    reportContent.mutate(
      {
        eventId,
        sessionToken,
        targetType: "post_event_comment",
        targetId: c._id,
        reportedActorType: "guest",
        reportedActorId: c.guest?._id,
        reason,
      },
      {
        onSuccess: () => toast?.success(t("moderation.reported")),
        onError: () => toast?.error(t("moderation.failed")),
      }
    );
  };

  const handleReport = (c) => {
    Alert.alert(t("moderation.reportTitle"), t("moderation.reportMsg"), [
      { text: t("moderation.reasonSpam"), onPress: () => submitReport(c, "spam") },
      { text: t("moderation.reasonHarassment"), onPress: () => submitReport(c, "harassment") },
      { text: t("moderation.reasonOther"), onPress: () => submitReport(c, "other") },
      { text: t("moderation.cancel"), style: "cancel" },
    ]);
  };

  const handleBlock = (c) => {
    Alert.alert(t("moderation.blockTitle"), t("moderation.blockMsg"), [
      {
        text: t("moderation.block"),
        style: "destructive",
        onPress: () =>
          blockActor.mutate(
            {
              eventId,
              postId: post._id,
              sessionToken,
              blockedActorType: "guest",
              blockedActorId: c.guest?._id,
            },
            {
              onSuccess: () => toast?.success(t("moderation.blocked")),
              onError: () => toast?.error(t("moderation.failed")),
            }
          ),
      },
      { text: t("moderation.cancel"), style: "cancel" },
    ]);
  };

  const openCommentMenu = (c) => {
    if (!c.guest?._id) return;
    Alert.alert(c.guest?.name || "", undefined, [
      { text: t("moderation.menuReport"), onPress: () => handleReport(c) },
      { text: t("moderation.menuBlock"), style: "destructive", onPress: () => handleBlock(c) },
      { text: t("moderation.cancel"), style: "cancel" },
    ]);
  };

  // Report the post/media itself (not a comment).
  const submitPostReport = (reason) => {
    reportContent.mutate(
      {
        eventId,
        sessionToken,
        targetType: "post_event_media",
        targetId: post._id,
        reason,
      },
      {
        onSuccess: () => toast?.success(t("moderation.reported")),
        onError: () => toast?.error(t("moderation.failed")),
      }
    );
  };

  const handleReportPost = () => {
    Alert.alert(t("moderation.reportPost"), t("moderation.reportMsg"), [
      { text: t("moderation.reasonSpam"), onPress: () => submitPostReport("spam") },
      { text: t("moderation.reasonHarassment"), onPress: () => submitPostReport("harassment") },
      { text: t("moderation.reasonOther"), onPress: () => submitPostReport("other") },
      { text: t("moderation.cancel"), style: "cancel" },
    ]);
  };

  const commentsQuery = usePostEventComments(
    eventId,
    post._id,
    { page, limit: 20 },
    sessionToken,
    {
      enabled: !readOnly && !!showComments && !!eventId && !!sessionToken && settings.allowComments !== false,
    }
  );

  // React Query v5 dropped `onError` on useQuery — surface failures via
  // an effect so comment-load errors no longer slip past silently.
  useEffect(() => {
    if (commentsQuery.isError) {
      toast?.error(t("comment.error"));
    }
  }, [commentsQuery.isError, commentsQuery.error, t, toast]);

  const commentsResult = commentsQuery.data?.data;
  useEffect(() => {
    if (!commentsResult?.comments) return;
    setLoadedComments(previous => page === 1 ? commentsResult.comments : [...new Map([...previous, ...commentsResult.comments].map(comment => [comment._id, comment])).values()]);
  }, [commentsResult, page]);
  const comments = readOnly ? (post.comments || []) : loadedComments;

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate(
      { eventId, postId: post._id, sessionToken },
      {
        onError: () => toast?.error(t("like.error")),
      }
    );
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if ((!text && !attachments.length) || addComment.isPending || readOnly) return;
    let formData;
    try { formData = await buildPostEventMediaForm(attachments, Platform.OS, 'images'); }
    catch { toast?.error(t('comment.error')); return; }
    formData.append("text", text);
    addComment.mutate(
      { eventId, postId: post._id, formData, sessionToken },
      {
        onSuccess: () => {
          setCommentText("");
          setAttachments([]);
          setPage(1);
          toast?.success(t("comment.success"));
        },
        onError: () => toast?.error(t("comment.error")),
      }
    );
  };

  const toggleCommentsVisibility = () => setShowComments((v) => !v);

  return (
    <>
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLike}
          disabled={readOnly || settings.allowLikes === false || toggleLike.isPending}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#e74c3c" : "#666"}
          />
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
            {isolateLtr(formatCount(likesCount, currentLanguage))}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          disabled={settings.allowComments === false}
          onPress={toggleCommentsVisibility}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionCount}>
            {isolateLtr(formatCount(commentsCount, currentLanguage))}
          </Text>
        </TouchableOpacity>

        {!!post._id && <TouchableOpacity
          style={[styles.actionBtn, styles.reportAction]}
          disabled={readOnly}
          onPress={handleReportPost}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("moderation.reportPost")}
        >
          <Ionicons name="flag-outline" size={18} color="#999" />
          <Text style={styles.reportText}>{t("moderation.report")}</Text>
        </TouchableOpacity>}
      </View>

      {showComments && settings.allowComments !== false && (
        <View style={styles.commentsSection}>
          {commentsQuery.isLoading ? (
            <ActivityIndicator
              size="small"
              color="#c28e5c"
              style={{ marginVertical: 12 }}
            />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>{t("comment.empty")}</Text>
          ) : (
            comments.map((c) => (
              <View key={c._id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Ionicons
                    name="person-circle"
                    size={28}
                    color="#c28e5c"
                  />
                </View>
                <View style={styles.commentBubble}>
                  {/* Guest name + comment body are arbitrary user content —
                      adaptive first-strong rendering with isolation. */}
                  <AdaptiveText style={styles.commentName} numberOfLines={1}>
                    {c.guest?.name || t("comment.guestFallback")}
                  </AdaptiveText>
                  <AdaptiveText style={styles.commentText}>
                    {c.text}
                  </AdaptiveText>
                  {(c.images || []).map((image, index) => <Image key={index} source={{ uri: getImageUrl(typeof image === 'string' ? image : image.url) }} style={{ width: 160, height: 120, borderRadius: 8, marginTop: 8 }} resizeMode="contain" />)}
                </View>
                <TouchableOpacity
                  style={styles.commentMenuBtn}
                  disabled={readOnly}
                  onPress={() => openCommentMenu(c)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("moderation.menuReport")}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {!readOnly && page < (commentsResult?.pagination?.totalPages || commentsResult?.totalPages || 1) && <TouchableOpacity onPress={() => setPage(value => value + 1)}><Text style={{ color: '#C28E5C', padding: 12 }}>{t('comments.loadMore', { defaultValue: currentLanguage === 'ar' ? 'عرض المزيد' : 'Load more' })}</Text></TouchableOpacity>}
          {!readOnly && <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {attachments.map((asset, index) => <TouchableOpacity key={index} accessibilityLabel={t('aria.close')} onPress={() => setAttachments(items => items.filter((_, i) => i !== index))}><Image source={{ uri: asset.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} /><Ionicons name="close-circle" size={20} style={{ position: 'absolute', end: 0 }} /></TouchableOpacity>)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={pickImages} disabled={attachments.length >= 10} accessibilityLabel={t('aria.attachImages', { defaultValue: currentLanguage === 'ar' ? 'إرفاق صور' : 'Attach photos' })} style={{ padding: 10 }}><Ionicons name="image-outline" size={24} color="#C28E5C" /></TouchableOpacity>
            {['🤍', '😍', '👏', '🎉', '🙏'].map(emoji => <TouchableOpacity key={emoji} onPress={() => setCommentText(text => (text + emoji).slice(0, 1000))}><Text style={{ fontSize: 22 }}>{emoji}</Text></TouchableOpacity>)}
          </View>
          <View style={styles.commentInputRow}>
            {/* Guest comment text is arbitrary content — placeholder follows
                the UI locale, a filled value follows its first strong char. */}
            <TextInput
              contentDirection="adaptive"
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("comment.placeholder")}
              placeholderTextColor="#a0a0a0"
              multiline
              maxLength={1000}
              editable={!addComment.isPending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!commentText.trim() && !attachments.length) || addComment.isPending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendComment}
              disabled={readOnly || (!commentText.trim() && !attachments.length) || addComment.isPending}
              activeOpacity={0.7}
            >
              {addComment.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {/* Legal prefix is app copy — authored translation key, never an
              inline bilingual ternary (blueprint §6). LegalLinks resolves
              the active locale itself. */}
          <LegalLinks
            docTypes={["terms", "community-rules"]}
            prefix={t("comment.legalPrefix")}
          />
          </>}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  postActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    marginTop: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportAction: { marginStart: "auto" },
  reportText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#999" },
  actionCount: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#666",
  },
  actionCountLiked: { color: "#e74c3c" },
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  commentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "flex-start",
  },
  commentAvatar: { marginTop: 2 },
  commentBubble: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentMenuBtn: { paddingHorizontal: 4, paddingTop: 6 },
  commentName: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#c28e5c",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    lineHeight: 20,
  },
  noComments: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
    marginVertical: 16,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    maxHeight: 80,
    backgroundColor: "#f7f7f7",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#c28e5c",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#e0e0e0" },
});

export default PostInteractions;
