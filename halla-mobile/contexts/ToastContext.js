import React, { createContext, useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(
    ({ message, type = "info", duration = 3000 }) => {
      const id = Date.now();
      const newToast = { id, message, type, opacity: new Animated.Value(0) };

      setToasts((prev) => [...prev, newToast]);

      // Fade in
      Animated.timing(newToast.opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto dismiss
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    []
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast) {
        Animated.timing(toast.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToasts((current) => current.filter((t) => t.id !== id));
        });
      }
      return prev;
    });
  }, []);

  const success = useCallback(
    (message, duration) => showToast({ message, type: "success", duration }),
    [showToast]
  );

  const error = useCallback(
    (message, duration) => showToast({ message, type: "error", duration }),
    [showToast]
  );

  const info = useCallback(
    (message, duration) => showToast({ message, type: "info", duration }),
    [showToast]
  );

  const warning = useCallback(
    (message, duration) => showToast({ message, type: "warning", duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const Toast = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      default:
        return "information-circle";
    }
  };

  const getColor = () => {
    switch (toast.type) {
      case "success":
        return "#4caf50";
      case "error":
        return "#e74c3c";
      case "warning":
        return "#ff9800";
      default:
        return "#2196f3";
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity: toast.opacity, borderLeftColor: getColor() },
      ]}
    >
      <Ionicons name={getIcon()} size={24} color={getColor()} />
      <Text style={styles.message}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#666" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
