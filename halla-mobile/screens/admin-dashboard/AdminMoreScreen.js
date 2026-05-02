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
import { useAuthStore } from "../../stores/authStore";
import { canViewPage, PAGES, ROLES } from "../../utils/adminPermissions";
import { colors, backgrounds, textStyles } from "../../styles/tokens";

const MENU_ITEMS = [
  {
    key: PAGES.PAYMENTS,
    label: "Payments",
    labelAr: "المدفوعات",
    icon: "card-outline",
    screen: "AdminPayments",
  },
  {
    key: PAGES.MODERATORS,
    label: "Moderators",
    labelAr: "المشرفون",
    icon: "shield-outline",
    screen: "AdminModeratorsList",
  },
  {
    key: PAGES.VENDORS,
    label: "Vendors",
    labelAr: "الموردون",
    icon: "storefront-outline",
    screen: "AdminVendorsList",
  },
  {
    key: PAGES.WHITELABELS,
    label: "Whitelabels",
    labelAr: "العلامات البيضاء",
    icon: "business-outline",
    screen: "AdminWhitelabelsList",
  },
  {
    key: PAGES.PLANS,
    label: "Plans",
    labelAr: "الباقات",
    icon: "cube-outline",
    screen: "AdminPlans",
    // Only shown for non-whitelabel admins (whitelabel goes to WhitelabelPlans)
    excludeRoles: [ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR],
  },
  {
    key: PAGES.PLANS,
    label: "My Plans",
    labelAr: "باقاتي",
    icon: "cube-outline",
    screen: "WhitelabelPlans",
    // Only shown for whitelabel admins
    onlyRoles: [ROLES.WHITELABEL_ADMIN],
  },
  {
    key: PAGES.DISCOUNTS,
    label: "Discounts",
    labelAr: "الخصومات",
    icon: "pricetag-outline",
    screen: "AdminDiscounts",
  },
  {
    key: PAGES.SETTINGS,
    label: "Settings",
    labelAr: "الإعدادات",
    icon: "settings-outline",
    screen: "AdminSettings",
  },
];

// Let me refine this based on the existing code structure.

const AdminMoreScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (!canViewPage(userRole, item.key)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(userRole)) return false;
    if (item.onlyRoles && !item.onlyRoles.includes(userRole)) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <ScrollView style={styles.container}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.key}
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
              <Text style={styles.menuItemLabel}>{item.label}</Text>
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
