import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Button } from "../commen";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

const EmailSentView = ({ onGoToEmail, onResend, resendDisabled = false }) => {
  const { t } = useTranslation("auth");
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToEmail = () => {
    if (onGoToEmail) {
      onGoToEmail();
    }
  };

  const handleResend = () => {
    if (onResend) {
      onResend();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✉️</Text>
        </View>
        <LocalizedText role="pageTitle" center style={styles.title}>
          {t("forgetPassword.emailSentTitle")}
        </LocalizedText>
      </View>

      {/* App copy follows the UI locale even though the referenced mailbox
          address itself would be an LTR token. */}
      <LocalizedText role="description" center style={styles.description}>
        {t("forgetPassword.emailSentDescription")}
      </LocalizedText>

      <View style={styles.buttons}>
        <Button
          text={t("forgetPassword.goToEmail")}
          onPress={handleGoToEmail}
        />
        <Button
          text={t("forgetPassword.resendLink")}
          onPress={handleResend}
          variant="outline"
          disabled={resendDisabled}
          style={styles.resendButton}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    color: "#2c2c2c",
  },
  description: {
    color: "#666",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttons: {
    width: "100%",
  },
  resendButton: {
    marginTop: 12,
  },
});

export default EmailSentView;
