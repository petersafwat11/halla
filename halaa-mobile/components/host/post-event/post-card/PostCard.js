import React from "react";
import { View, StyleSheet } from "react-native";
import PostMedia from "./PostMedia";
import PostInteractions from "./PostInteractions";
import AdaptiveText from "../../../commen/AdaptiveText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";

const PostCard = ({ post, eventId, sessionToken, t, toast, readOnly = false, host, eventDate, thankYouMessage, settings }) => {
  const { currentLanguage } = useTranslation('postEvent');
  const caption = currentLanguage === 'ar' ? (thankYouMessage?.textAr || thankYouMessage?.text || post.title) : (thankYouMessage?.textEn || thankYouMessage?.text || post.title);
  return (
    <View style={styles.postCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
        <Ionicons name="person-circle" size={42} color="#C28E5C" />
        <View style={{ flex: 1 }}>
          <AdaptiveText style={{ fontFamily: 'Cairo_700Bold', fontSize: 16 }}>{host?.name || ''}</AdaptiveText>
          {!!eventDate && <AdaptiveText style={{ color: '#777', fontSize: 12 }}>{formatDate(eventDate, currentLanguage)}</AdaptiveText>}
        </View>
      </View>
      {!!caption && <AdaptiveText style={[styles.postText, { paddingTop: 0, paddingBottom: 16 }]}>{caption}</AdaptiveText>}
      <PostMedia post={post} t={t} eventId={eventId} sessionToken={sessionToken} readOnly={readOnly} toast={toast} />

      {/* Guest captions are arbitrary content — first-strong direction with
          isolation, not the page locale. */}
      {post.content?.text ? (
        <AdaptiveText style={styles.postText}>{post.content.text}</AdaptiveText>
      ) : null}

      <View>
      <PostInteractions
        post={post}
        eventId={eventId}
        sessionToken={sessionToken}
        t={t}
        toast={toast}
        readOnly={readOnly}
        settings={settings}
      />
      </View>
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
