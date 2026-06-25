import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * App-level error boundary.
 *
 * Catches uncaught render-time errors anywhere in the
 * tree and renders a recoverable fallback UI. Without this, a single
 * runtime exception in a deeply-nested component renders the whole
 * navigator unmounted (white screen) until the app is force-quit.
 *
 * Bilingual fallback strings — Arabic primary, English fallback.
 *
 * The "Reload" button resets internal state via `key`-bumping. If the
 * underlying issue persists (e.g. a corrupted persisted store), the
 * boundary catches the next render and surfaces the same UI again.
 *
 * Production usage: in a release build, log the error to Sentry or
 * Crashlytics here. Today we only `console.error` so dev sessions can
 * surface the stack.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, recoveryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Uncaught render error:", error, info?.componentStack);
    this.setState({ info });
  }

  handleReload = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      info: null,
      recoveryKey: prev.recoveryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || "Unknown error";
      return (
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <Ionicons name="alert-circle-outline" size={56} color="#C28E5C" />
          </View>
          <Text style={styles.title}>حدث خطأ غير متوقع</Text>
          <Text style={styles.titleEn}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            يرجى إعادة المحاولة. إذا استمرت المشكلة، أعد تشغيل التطبيق.
          </Text>
          <Text style={styles.subtitleEn}>
            Please try again. If the issue persists, restart the app.
          </Text>

          {__DEV__ ? (
            <ScrollView
              style={styles.devDetails}
              contentContainerStyle={styles.devDetailsContent}
            >
              <Text style={styles.devLabel}>error.message</Text>
              <Text style={styles.devText}>{message}</Text>
              {this.state.info?.componentStack ? (
                <>
                  <Text style={styles.devLabel}>componentStack</Text>
                  <Text style={styles.devText}>{this.state.info.componentStack.trim()}</Text>
                </>
              ) : null}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={styles.reloadButton}
            onPress={this.handleReload}
            activeOpacity={0.8}
          >
            <Ionicons name="reload" size={18} color="#FFF" />
            <Text style={styles.reloadButtonText}>إعادة المحاولة / Reload</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <React.Fragment key={this.state.recoveryKey}>{this.props.children}</React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F5ECE4",
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  titleEn: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  subtitleEn: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 24,
  },
  devDetails: {
    maxHeight: 220,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    marginBottom: 16,
  },
  devDetailsContent: {
    padding: 12,
  },
  devLabel: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
    marginBottom: 4,
    marginTop: 6,
  },
  devText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 16,
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#C28E5C",
  },
  reloadButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default ErrorBoundary;
