import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  togglePostEventLike,
  addPostEventComment,
  getPostEventComments,
} from "../../../services/postEventService";

const PostCard = ({ post, eventId, sessionToken, guestId, t, toast }) => {
  const [liked, setLiked] = useState(
    post.likes?.some((l) => l.guest?.toString() === guestId?.toString()) ||
      false
  );
  const [likesCount, setLikesCount] = useState(
    post.likesCount ?? post.likes?.length ?? 0
  );
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
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    try {
      const result = await togglePostEventLike(eventId, post._id, sessionToken);
      setLiked(result?.data?.liked ?? !prevLiked);
      setLikesCount(result?.data?.likesCount ?? prevCount);
    } catch {
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
      const result = await getPostEventComments(
        eventId,
        post._id,
        sessionToken
      );
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
      const result = await addPostEventComment(
        eventId,
        post._id,
        text,
        sessionToken
      );
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.galleryScroll}
        >
          {post.content.mediaUrls.map((url, idx) => (
            <Image
              key={idx}
              source={{ uri: url }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
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

      {showComments && (
        <View style={styles.commentsSection}>
          {commentsLoading ? (
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
              editable={!sendingComment}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || sendingComment) &&
                  styles.sendButtonDisabled,
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

const styles = StyleSheet.create({
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
  galleryScroll: { height: 200 },
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

export default PostCard;
