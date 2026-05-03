import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { useAuthStore } from "../stores/authStore";
import AdminNavigator from "./AdminNavigator";
import { useTranslation } from "../localization";
import { colors, backgrounds } from "../styles/tokens";

// Import your screen components here
import WelcomeWrapper from "../components/welcom/WelcomeWrapper";
import HomeScreen from "../screens/HomeScreen";
import VendorHomeScreen from "../screens/VendorHomeScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgetPasswordScreen from "../screens/ForgetPasswordScreen";
import PlansScreen from "../screens/PlansScreen";
import PlansSummaryScreen from "../screens/PlansSummaryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import TicketsScreen from "../screens/TicketsScreen";
import Marketplace from "../screens/Marketplace";
import EventsScreen from "../screens/EventsScreen";
import CreateEventScreen from "../screens/CreateEventScreen";
import HostUpdateEventScreen from "../screens/host/UpdateEventScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import VendorServicesScreen from "../screens/VendorServicesScreen";

import VendorSettingsScreen from "../screens/VendorSettingsScreen";
import VendorAccountSetupScreen from "../screens/VendorAccountSetupScreen";
import VendorSignupScreen from "../screens/VendorSignupScreen";
import WhitelabelSignupScreen from "../screens/WhitelabelSignupScreen";
import PostEventScreen from "../screens/PostEventScreen";
import StaffPortalScreen from "../screens/StaffPortalScreen";
import HostPostEventScreen from "../screens/HostPostEventScreen";
import SetupPasswordScreen from "../screens/SetupPasswordScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SettingsStackNav = createStackNavigator();
const VendorSettingsStackNav = createStackNavigator();

// Settings Stack (nested inside tabs to keep bottom navbar visible)
function SettingsStackNavigator() {
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStackNav.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <SettingsStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </SettingsStackNav.Navigator>
  );
}

// Vendor Settings Stack (nested inside tabs to keep bottom navbar visible)
function VendorSettingsStackNavigator() {
  return (
    <VendorSettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VendorSettingsStackNav.Screen name="VendorSettingsMain" component={VendorSettingsScreen} />
      <VendorSettingsStackNav.Screen name="VendorAccountSetup" component={VendorAccountSetupScreen} />
    </VendorSettingsStackNav.Navigator>
  );
}

// Host Tab Navigator (for authenticated hosts)
function HostTabNavigator() {
  const { t } = useTranslation("common");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Tickets") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else if (route.name === "Plans") {
            iconName = focused ? "pricetag" : "pricetag-outline";
          } else if (route.name === "Marketplace") {
            iconName = focused ? "storefront" : "storefront-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.natural[350],
        tabBarStyle: {
          backgroundColor: backgrounds.card[1],
          borderTopColor: colors.natural[200],
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t("navigation.home") }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarLabel: t("navigation.events") }}
      />
      <Tab.Screen
        name="Marketplace"
        component={Marketplace}
        options={{ tabBarLabel: t("navigation.marketplace") }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{ tabBarLabel: t("navigation.plans") }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: t("navigation.settings") }}
      />
    </Tab.Navigator>
  );
}

// Vendor Tab Navigator (for authenticated vendors)
function VendorTabNavigator() {
  const { t } = useTranslation("common");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "VendorHome") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Tickets") {
            iconName = focused ? "ticket" : "ticket-outline";
          } else if (route.name === "Marketplace") {
            iconName = focused ? "storefront" : "storefront-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.natural[350],
        tabBarStyle: {
          backgroundColor: backgrounds.card[1],
          borderTopColor: colors.natural[200],
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Cairo_500Medium",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="VendorHome"
        component={VendorHomeScreen}
        options={{ tabBarLabel: t("navigation.home") }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ tabBarLabel: t("navigation.tickets") }}
      />
      <Tab.Screen
        name="Marketplace"
        component={Marketplace}
        options={{ tabBarLabel: t("navigation.marketplace") }}
      />
      <Tab.Screen
        name="Settings"
        component={VendorSettingsStackNavigator}
        options={{ tabBarLabel: t("navigation.settings") }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator (for unauthenticated users)
function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeWrapper
            onSkip={() => navigation.navigate("Login")}
            onLogin={() => navigation.navigate("Login")}
            onSignup={() => navigation.navigate("Signup")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
      <Stack.Screen name="VendorSignup" component={VendorSignupScreen} />
      <Stack.Screen name="WhitelabelSignup" component={WhitelabelSignupScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="StaffPortal" component={StaffPortalScreen} />
      {/* Phase 4 W3-WL — also reachable via halla://setup-password/<token> */}
      <Stack.Screen name="SetupPassword" component={SetupPasswordScreen} />
    </Stack.Navigator>
  );
}

// Host Stack Navigator (for authenticated hosts)
function HostStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={HostTabNavigator} />
      <Stack.Screen name="CreateEventScreen" component={CreateEventScreen} />
      <Stack.Screen name="UpdateEventScreen" component={HostUpdateEventScreen} />
      <Stack.Screen name="PlansSummary" component={PlansSummaryScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PostEvent" component={PostEventScreen} />
      <Stack.Screen name="HostPostEvent" component={HostPostEventScreen} />
    </Stack.Navigator>
  );
}

// Vendor Stack Navigator (for authenticated vendors)
function VendorStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={VendorTabNavigator} />
      <Stack.Screen name="VendorServices" component={VendorServicesScreen} />

      <Stack.Screen name="VendorSettings" component={VendorSettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// Admin Stack Navigator (for authenticated admins/moderators/whitelabel)
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={AdminNavigator} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// Root Navigator - switches between Auth and role-based stacks based on auth status
export default function AppNavigator() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);

  // Show loading while checking auth status
  if (status === "checking") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Show auth stack if not authenticated
  if (status !== "authenticated") {
    return <AuthStack />;
  }

  // Show appropriate stack based on user role
  switch (role) {
    case "host":
      return <HostStack />;
    case "vendor":
      return <VendorStack />;
    case "super_admin":
    case "admin":
    case "moderator":
    case "whitelabel_admin":
    case "whitelabel_moderator":
      return <AdminStack />;
    default:
      // FLOW-05-F03: never silently route to HostStack. An unmapped role is
      // a real bug — surface it instead of pretending the user is a host.
      console.error("Unsupported account role:", role);
      return (
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.error?.[500] || "#dc2626", textAlign: "center", padding: 24 }}>
            Unsupported account type — please contact support.
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
