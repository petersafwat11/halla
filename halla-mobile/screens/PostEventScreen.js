import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../localization";
import { useToast } from "../contexts/ToastContext";
import {
  validatePostEventToken,
  getPostEventContent,
  togglePostEventLike,
  addPostEventComment,
  getPostEventComments,
} from "../services/postEventService";

// ─── PostCard sub-component ──────────────────────────────────────────────────

const PostCard = ({ post, eventId, sessionToken, guestId, t, toast }) => {
  const [liked, setLiked] = useState(
    post.likes?.some((l) => l.guest?.toString() === guestId?.toString()) || false
  );
  const [likesCount, setLikesCount] = useState(post.likesCount ?? post.likes?.length ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = likesCount;
    // Optimistic update
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    try {
      const result = await togglePostEventLike(eventId, post._id, sessionToken);
      setLiked(result?.data?.liked ?? !prevLiked);
      setLikesCount(result?.data?.likesCount ?? prevCount);
    } catch {
      // Revert on error
      setLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error(t("like.error"));
    } finally {
      setLiking(false);
    }
  };

  const loadComments = async () => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const result = await getPostEventComments(eventId, post._id, sessionToken);
      setComments(result?.data?.comments || []);
    } catch {
      /* silent */
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSendingComment(true);
    try {
      const result = await addPostEventComment(eventId, post._id, text, sessionToken);
      const newComment = result?.data?.comment;
      if (newComment) setComments((prev) => [...prev, newComment]);
      setCommentText("");
      toast.success(t("comment.success"));
    } catch {
      toast.error(t("comment.error"));
    } finally {
      setSendingComment(false);
    }
  };

  const renderMediaContent = () => {
    if (post.type === "photo" && post.content?.mediaUrl) {
      return (
        <Image
          source={{ uri: post.content.mediaUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      );
    }
    if (post.type === "gallery" && post.content?.mediaUrls?.length > 0) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
          {post.content.mediaUrls.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" />
          ))}
        </ScrollView>
      );
    }
    if (post.type === "video" && post.content?.mediaUrl) {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={40} color="#c28e5c" />
          <Text style={styles.videoText}>{t("post.video")}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.postCard}>
      {renderMediaContent()}

      {post.content?.text ? (
        <Text style={styles.postText}>{post.content.text}</Text>
      ) : null}

      {/* Action row */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLike}
          disabled={liking}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#e74c3c" : "#666"}
          />
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={toggleComments}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionCount}>
            {post.commentsCount ?? post.comments?.length ?? 0}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {commentsLoading ? (
            <ActivityIndicator size="small" color="#c28e5c" style={{ marginVertical: 12 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>{t("comment.empty")}</Text>
          ) : (
            comments.map((c) => (
              <View key={c._id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Ionicons name="person-circle" size={28} color="#c28e5c" />
                </View>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentName}>
                    {c.guest?.name || "Guest"}
                  </Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("comment.placeholder")}
              placeholderTextColor="#a0a0a0"
              multiline
              maxLength={500}
              editable={!sendingComment}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || sendingComment) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
              activeOpacity={0.7}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PostEventScreen({ navigation, route }) {
  const { t } = useTranslation("postEvent");
  const toast = useToast();
  const { token: accessToken } = route?.params || {};

  const [stage, setStage] = useState("validating"); // validating | invalid | loading | ready
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
      const content = result?.data?.content || result?.data || {};
      const rawPosts = content.posts || [];
      // Filter only published posts, sort by order
      const published = rawPosts
        .filter((p) => p.isPublished !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setPosts(published);
      setThankYouMessage(content.thankYouMessage);
      setStage("ready");
    } catch {
      setStage("ready"); // Show empty state
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) navigation.goBack();
  };

  // ── Render: validating ─────────────────────────────────────────────────────
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

  // ── Render: invalid ────────────────────────────────────────────────────────
  if (stage === "invalid") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#c28e5c" />
          <Text style={styles.invalidTitle}>{t("accessDenied")}</Text>
          <Text style={styles.invalidDesc}>{t("accessDeniedDesc")}</Text>
          {navigation?.canGoBack() && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: ready ──────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* Event header */}
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

      {/* Thank-you card */}
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
        {/* TopBar */}
        <View style={styles.topBar}>
          {navigation?.canGoBack() && (
            <TouchableOpacity onPress={handleBack} style={styles.topBarBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>
            {eventInfo?.title || "Post Event"}
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
  // TopBar
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
  listContent: {
    paddingBottom: 32,
  },
  // Event header
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
  eventHeaderText: {
    flex: 1,
  },
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
  // Thank-you card
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
  thankYouIcon: {
    marginBottom: 8,
  },
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
  // Empty state
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
  // Post card
  postCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  postImage: {
    width: "100%",
    height: 240,
    backgroundColor: "#f0e8e0",
  },
  galleryScroll: {
    height: 200,
  },
  galleryImage: {
    width: 200,
    height: 200,
    marginRight: 4,
    backgroundColor: "#f0e8e0",
  },
  videoPlaceholder: {
    height: 180,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  videoText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  postText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    lineHeight: 22,
    padding: 16,
    paddingBottom: 0,
  },
  // Post actions
  postActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#666",
  },
  actionCountLiked: {
    color: "#e74c3c",
  },
  // Comments
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
  commentAvatar: {
    marginTop: 2,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
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
  sendButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
});
