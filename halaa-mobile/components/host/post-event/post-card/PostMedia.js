import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PostMedia = ({ post, t }) => {
  if (post.type === "photo" && (post.url || post.content?.mediaUrl)) {
    const uri = post.url || post.content?.mediaUrl;
    return (
      <Image
        source={{ uri }}
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
  if (post.type === "video" && (post.url || post.content?.mediaUrl)) {
    return (
      <View style={styles.videoPlaceholder}>
        <Ionicons name="videocam" size={40} color="#c28e5c" />
        <Text style={styles.videoText}>{t("post.video")}</Text>
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
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
});

export default PostMedia;
