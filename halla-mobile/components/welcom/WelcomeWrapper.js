import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useTranslation } from "../../localization";
import Welcome from "./Welcome";

const { width, height } = Dimensions.get("window");

const WelcomeWrapper = ({ onSkip, onLogin, onSignup }) => {
  const { t, isRTL } = useTranslation("welcome");

  return (
    <View style={[styles.page, { direction: isRTL ? "rtl" : "ltr" }]}>
      <TouchableOpacity style={styles.skip} onPress={onSkip}>
        <Text style={styles.skipText}>{t("skip")}</Text>
      </TouchableOpacity>

      <Image
        source={require("../../assets/home/welcom-bg.png")}
        style={styles.welcomeBg}
        resizeMode="contain"
      />

      <Welcome onLogin={onLogin} onSignup={onSignup} />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    position: "relative",
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 48,
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    height: height,
    backgroundColor: "#f5f5f5",
  },
  skip: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  skipText: {
    color: "#c28e5c",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0.08,
    fontFamily: "Cairo_600SemiBold", // Cairo font
  },
  welcomeBg: {
    position: "absolute",
    top: "13.2%",
    left: "16%",
    width: "80%",
    height: "80%",
    zIndex: 1,
  },
});

export default WelcomeWrapper;
