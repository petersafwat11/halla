import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../../stores/authStore";
import { canViewPage, PAGES } from "../../../utils/adminPermissions";
import { colors, backgrounds, textStyles } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";

const MENU_ITEMS = [
  {
    key: PAGES.PAYMENTS,
    labelKey: "more.payments",
    icon: "card-outline",
    screen: "AdminPayments",
  },
  {
    key: PAGES.MODERATORS,
    labelKey: "more.moderators",
    icon: "shield-outline",
    screen: "AdminModeratorsList",
  },
  {
    key: PAGES.VENDORS,
    labelKey: "more.vendors",
    icon: "storefront-outline",
    screen: "AdminVendorsList",
  },
  {
    key: PAGES.PLANS,
    labelKey: "more.plans",
    icon: "cube-outline",
    screen: "AdminPlans",
  },
  {
    key: PAGES.DISCOUNTS,
    labelKey: "more.discounts",
    icon: "pricetag-outline",
    screen: "AdminDiscounts",
  },
  {
    key: PAGES.SETTINGS,
    labelKey: "more.settings",
    icon: "settings-outline",
    screen: "AdminSettings",
  },
];

const AdminMoreScreen = ({ navigation }) => {
  const { t } = useTranslation("admin");
  const { user } = useAuthStore();
  const userRole = user?.role;

  const visibleItems = MENU_ITEMS.filter((item) =>
    canViewPage(userRole, item.key)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("more.title")}</Text>
      </View>
      <ScrollView style={styles.container}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.labelKey}
            style={styles.menuItem}
            onPress={() => item.params ? navigation.navigate(item.screen, item.params) : navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={colors.primary[500]}
                />
              </View>
              <Text style={styles.menuItemLabel}>{t(item.labelKey)}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.natural[350]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[1],
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
    backgroundColor: backgrounds.card[1],
  },
  headerTitle: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: backgrounds.card[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemLabel: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
  },
});

export default AdminMoreScreen;
