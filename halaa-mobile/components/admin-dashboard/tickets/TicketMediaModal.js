import React, { useState } from "react";
import { View, Modal, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocalizedText from "../../commen/LocalizedText";
import DirectionalIonicon from "../../common/DirectionalIonicon";
import { useTranslation } from "../../../localization";
import { getImageUrl } from "../../../utils/imageUtils";

function VideoAttachment({ uri }) {
  const player = useVideoPlayer(uri, (instance) => { instance.play(); });
  return <VideoView style={styles.media} player={player} nativeControls contentFit="contain" />;
}

export default function TicketMediaModal({ attachments, onClose }) {
  const { t } = useTranslation("admin");
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const media = attachments.filter((item) => item?.url);
  const attachment = media[index];
  if (!attachment) return null;
  const uri = getImageUrl(attachment.url);
  const isVideo = attachment.type === "video" || attachment.mimeType?.startsWith("video/");
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
      {isVideo ? <VideoAttachment key={uri} uri={uri} /> : <Image source={{ uri }} style={styles.media} resizeMode="contain" accessibilityLabel={t("tickets.media.view")} />}
      {media.length > 1 && <View style={styles.navigation}>
        <TouchableOpacity style={styles.arrow} onPress={() => setIndex((index + media.length - 1) % media.length)} accessibilityRole="button" accessibilityLabel={t("tickets.media.previous")}>
          <DirectionalIonicon name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <LocalizedText style={styles.counter}>{`${index + 1} / ${media.length}`}</LocalizedText>
        <TouchableOpacity style={styles.arrow} onPress={() => setIndex((index + 1) % media.length)} accessibilityRole="button" accessibilityLabel={t("tickets.media.next")}>
          <DirectionalIonicon name="chevron-forward" size={28} color="#fff" />
        </TouchableOpacity>
      </View>}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center" },
  close: { alignSelf: "flex-end", width: 48, height: 48, alignItems: "center", justifyContent: "center", marginEnd: 16 },
  media: { flex: 1, width: "100%" },
  navigation: { flexDirection: "row", alignItems: "center", gap: 24, padding: 16 },
  arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  counter: { color: "#fff", writingDirection: "ltr" },
});
