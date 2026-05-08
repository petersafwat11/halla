import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PostMedia from "./PostMedia";
import PostInteractions from "./PostInteractions";

const PostCard = ({ post, eventId, sessionToken, t, toast }) => {
  return (
    <View style={styles.postCard}>
      <PostMedia post={post} t={t} />

      {post.content?.text ? (
        <Text style={styles.postText}>{post.content.text}</Text>
      ) : null}

      <PostInteractions
        post={post}
        eventId={eventId}
        sessionToken={sessionToken}
        t={t}
        toast={toast}
      />
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
  postText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    lineHeight: 22,
    padding: 16,
    paddingBottom: 0,
  },
});

export default PostCard;
