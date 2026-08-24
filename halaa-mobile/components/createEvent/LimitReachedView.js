import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../plans/TopBar";
import DirectionalIonicon from "../common/DirectionalIonicon";
import LocalizedText from "../commen/LocalizedText";

export default function LimitReachedView({ tEvents, title, leftContent, navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <TopBar title={title} leftContent={leftContent} />
      <View style={styles.content}>
        <Ionicons name="alert-circle-outline" size={64} color="#C28E5C" />
        {/* App-authored copy → LocalizedText so the heading/message follow
            the UI locale even when the plan name inside is Latin. */}
        <LocalizedText role="sectionTitle" style={styles.heading} center>
          {tEvents?.("limitReachedView.title")}
        </LocalizedText>
        <LocalizedText role="body" style={styles.message} center>
          {tEvents?.("limitReachedView.message")}
        </LocalizedText>
        {navigation && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <DirectionalIonicon name="arrow-back" size={18} color="#FFF" />
            <LocalizedText style={styles.backButtonText}>
              {tEvents?.("limitReachedView.goBack")}
            </LocalizedText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
});
