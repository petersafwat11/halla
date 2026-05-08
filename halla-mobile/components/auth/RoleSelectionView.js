import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const ROLES = [
  {
    id: "host",
    icon: "home-outline",
    titleKey: "signup.hostRole",
    descKey: "signup.hostRoleDescription",
    accentColor: "#c28e5c",
    bgColor: "#f5ece4",
  },
  {
    id: "vendor",
    icon: "storefront-outline",
    titleKey: "signup.vendorRole",
    descKey: "signup.vendorRoleDescription",
    accentColor: "#2a8c5b",
    bgColor: "#e6f4ed",
  },
  {
    id: "whitelabel",
    icon: "business-outline",
    titleKey: "signup.businessRole",
    descKey: "signup.businessRoleDescription",
    accentColor: "#3d6fcc",
    bgColor: "#eaf0fb",
  },
];

function RoleCard({ role, index, onPress }) {
  const { t } = useTranslation("auth");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 120,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(role.id)}
        activeOpacity={0.72}
      >
        {/* Left accent bar */}
        <View
          style={[styles.accentBar, { backgroundColor: role.accentColor }]}
        />

        {/* Icon box */}
        <View style={[styles.iconBox, { backgroundColor: role.bgColor }]}>
          <Ionicons name={role.icon} size={26} color={role.accentColor} />
        </View>

        {/* Text */}
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{t(role.titleKey)}</Text>
          <Text style={styles.cardDesc}>{t(role.descKey)}</Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color="#a0a0a0" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RoleSelectionView({ onSelectRole, onLogin }) {
  const { t } = useTranslation("auth");

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerY, {
        toValue: 0,
        tension: 55,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerY }] },
        ]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="layers-outline" size={30} color="#c28e5c" />
        </View>
        <Text style={styles.title}>{t("signup.selectRole")}</Text>
        <Text style={styles.subtitle}>{t("signup.selectRoleDescription")}</Text>
      </Animated.View>

      {/* Role cards */}
      <View style={styles.cards}>
        {ROLES.map((role, i) => (
          <RoleCard
            key={role.id}
            role={role}
            index={i}
            onPress={onSelectRole}
          />
        ))}
      </View>

      {/* Login link */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>{t("signup.hasAccount")} </Text>
        <TouchableOpacity onPress={onLogin}>
          <Text style={styles.loginLink}>{t("signup.signIn")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#f5ece4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#c28e5c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
    textAlign: "center",
    lineHeight: 22,
  },
  cards: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    paddingVertical: 18,
    paddingRight: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginRight: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
    lineHeight: 20,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 36,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#a0a0a0",
  },
  loginLink: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});
