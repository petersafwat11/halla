import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import Welcome from "./Welcome";

const WelcomeWrapper = ({ onSkip, onLogin, onSignup }) => {
  const { t } = useTranslation("welcome");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.page}>
        <TouchableOpacity
          style={styles.skip}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={t("skip", { defaultValue: "Skip" })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>{t("skip")}</Text>
        </TouchableOpacity>

        <Image
          source={require("../../assets/home/welcom-bg.png")}
          style={styles.welcomeBg}
          resizeMode="contain"
        />

        <Welcome onLogin={onLogin} onSignup={onSignup} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  page: {
    position: "relative",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
  },
  skip: {
    alignSelf: "flex-end",
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    color: "#c28e5c",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0.08,
    fontFamily: "Cairo_600SemiBold",
  },
  welcomeBg: {
    position: "absolute",
    top: "12%",
    width: "85%",
    height: "55%",
    zIndex: 0,
    alignSelf: "center",
  },
});

export default WelcomeWrapper;
