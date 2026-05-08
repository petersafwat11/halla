import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  usePostEventComments,
  useAddPostEventComment,
  useTogglePostEventLike,
} from "../../../../hooks/queries/post-event/useGuestPostEvent";

const PostInteractions = ({ post, eventId, sessionToken, t, toast }) => {
  const liked = !!post.userLiked;
  const likesCount = post.likesCount ?? post.likes?.length ?? 0;
  const commentsCount = post.commentsCount ?? post.comments?.length ?? 0;

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const toggleLike = useTogglePostEventLike();
  const addComment = useAddPostEventComment();

  const commentsQuery = usePostEventComments(
    eventId,
    post._id,
    { page: 1, limit: 20 },
    sessionToken,
    {
      enabled: !!showComments && !!eventId && !!post?._id && !!sessionToken,
    }
  );

  // React Query v5 dropped `onError` on useQuery — surface failures via
  // an effect so comment-load errors no longer slip past silently.
  useEffect(() => {
    if (commentsQuery.isError) {
      toast?.error(t("comment.error"));
    }
  }, [commentsQuery.isError, commentsQuery.error, t, toast]);

  const comments = commentsQuery.data?.data?.comments || [];

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate(
      { eventId, postId: post._id, sessionToken },
      {
        onError: () => toast?.error(t("like.error")),
      }
    );
  };

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text || addComment.isPending) return;
    const formData = new FormData();
    formData.append("text", text);
    addComment.mutate(
      { eventId, postId: post._id, formData, sessionToken },
      {
        onSuccess: () => {
          setCommentText("");
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
          disabled={toggleLike.isPending}
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
          onPress={toggleCommentsVisibility}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionCount}>{commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {showComments && (
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
                  <Text style={styles.commentName}>
                    {c.guest?.name || t("comment.guestFallback")}
                  </Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t("comment.placeholder")}
              placeholderTextColor="#a0a0a0"
              multiline
              maxLength={500}
              editable={!addComment.isPending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || addComment.isPending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || addComment.isPending}
              activeOpacity={0.7}
            >
              {addComment.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
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
