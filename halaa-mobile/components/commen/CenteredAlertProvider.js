import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "../../localization";
import LocalizedText from "./LocalizedText";

const nativeAlert = Alert.alert.bind(Alert);
let activePresenter = null;

// Keep the public React Native Alert contract intact so existing feature code
// does not need its own dialog state. Until the provider mounts (startup only),
// fall back to the platform alert.
const centeredAlert = (...args) => {
  if (activePresenter) activePresenter(...args);
  else nativeAlert(...args);
};

Alert.alert = centeredAlert;

export default function CenteredAlertProvider({ children }) {
  const { t } = useTranslation("common");
  const [request, setRequest] = useState(null);

  useEffect(() => {
    activePresenter = (title, message, buttons, options) => {
      setRequest({
        title: title == null ? "" : String(title),
        message: message == null ? "" : String(message),
        buttons:
          Array.isArray(buttons) && buttons.length
            ? buttons
            : [{ text: t("buttons.ok", { defaultValue: "OK" }) }],
        options: options || {},
      });
    };

    return () => {
      activePresenter = null;
    };
  }, [t]);

  const dismiss = (invokeDismiss = false) => {
    const onDismiss = request?.options?.onDismiss;
    setRequest(null);
    if (invokeDismiss) onDismiss?.();
  };

  const handleButton = (button) => {
    setRequest(null);
    button?.onPress?.();
  };

  const canDismiss = request?.options?.cancelable !== false;

  return (
    <>
      {children}
      <Modal
        visible={Boolean(request)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => canDismiss && dismiss(true)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => canDismiss && dismiss(true)}
        >
          <Pressable
            accessibilityRole="alert"
            style={styles.dialog}
            onPress={(event) => event.stopPropagation()}
          >
            {request?.title ? (
              <LocalizedText role="sectionTitle" center style={styles.title}>
                {request.title}
              </LocalizedText>
            ) : null}
            {request?.message ? (
              <LocalizedText role="body" center style={styles.message}>
                {request.message}
              </LocalizedText>
            ) : null}
            <View style={styles.actions}>
              {request?.buttons?.map((button, index) => (
                <TouchableOpacity
                  key={`${button?.text || "action"}-${index}`}
                  style={[
                    styles.action,
                    button?.style === "cancel" && styles.cancelAction,
                  ]}
                  onPress={() => handleButton(button)}
                  accessibilityRole="button"
                >
                  <LocalizedText
                    center
                    style={[
                      styles.actionText,
                      button?.style === "cancel" && styles.cancelText,
                      button?.style === "destructive" && styles.destructiveText,
                    ]}
                  >
                    {button?.text || t("buttons.ok", { defaultValue: "OK" })}
                  </LocalizedText>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    marginBottom: 8,
    fontSize: 18,
    lineHeight: 28,
  },
  message: {
    color: "#656565",
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
  },
  action: {
    minWidth: 96,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#C28E5C",
    borderRadius: 10,
    backgroundColor: "#C28E5C",
  },
  cancelAction: {
    backgroundColor: "#FFF",
  },
  actionText: {
    color: "#FFF",
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  destructiveText: {
    color: "#FFF",
  },
  cancelText: {
    color: "#6B4E33",
  },
});
