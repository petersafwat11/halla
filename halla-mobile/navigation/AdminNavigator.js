import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

// Design tokens
import { colors, backgrounds } from "../styles/tokens";

// Permissions utility
import {
  getNavItemsForRole,
  canViewPage,
  PAGES,
  isSuperAdmin,
} from "../utils/adminPermissions";

// Auth store
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../localization";

// Screen imports
import AdminDashboardScreen from "../screens/admin/admin-dashboard/AdminDashboardScreen";
import AdminHostsScreen from "../screens/admin/admin-dashboard/AdminHostsScreen";
import AdminModeratorsScreen from "../screens/admin/admin-dashboard/AdminModeratorsScreen";
import AdminVendorsScreen from "../screens/admin/admin-dashboard/AdminVendorsScreen";
import AdminWhitelabelsScreen from "../screens/admin/admin-dashboard/AdminWhitelabelsScreen";
import HostDetailsScreen from "../screens/admin/admin-dashboard/HostDetailsScreen";
import VendorDetailsScreen from "../screens/admin/admin-dashboard/VendorDetailsScreen";
import WhitelabelDetailsScreen from "../screens/admin/admin-dashboard/WhitelabelDetailsScreen";
import AdminEventsScreen from "../screens/admin/admin-dashboard/AdminEventsScreen";
import EventDetailsScreen from "../screens/admin/admin-dashboard/EventDetailsScreen";
import CreateEventScreen from "../screens/admin/admin-dashboard/CreateEventScreen";
// Phase 4d W1-MOBILE-UPDATE: admin route now resolves to the unified
// update wizard (D2 — single update-event page used by all roles). The
// admin-dashboard path stays as a re-export shim.
import UpdateEventScreen from "../screens/common/update-event/UpdateEventScreen";
import AdminTicketsScreen from "../screens/admin/admin-dashboard/AdminTicketsScreen";
import TicketDetailsScreen from "../screens/admin/admin-dashboard/TicketDetailsScreen";
import AdminPaymentsScreen from "../screens/admin/admin-dashboard/AdminPaymentsScreen";
import PaymentDetailScreen from "../screens/admin/admin-dashboard/PaymentDetailScreen";
import AdminPlansScreen from "../screens/admin/admin-dashboard/AdminPlansScreen";
import AdminSettingsScreen from "../screens/admin/admin-dashboard/AdminSettingsScreen";
import AdminAccountSettingsScreen from "../screens/admin/admin-dashboard/AdminAccountSettingsScreen";
import AdminNotificationSettingsScreen from "../screens/admin/admin-dashboard/AdminNotificationSettingsScreen";
import AdminMoreScreen from "../screens/admin/admin-dashboard/AdminMoreScreen";
import AdminDiscountsScreen from "../screens/admin/admin-dashboard/AdminDiscountsScreen";
import AdminTemplatesScreen from "../screens/admin/admin-dashboard/AdminTemplatesScreen";
import WhitelabelPlansScreen from "../screens/admin/WhitelabelPlansScreen";
import WhitelabelPlansSummaryScreen from "../screens/admin/WhitelabelPlansSummaryScreen";

// Create navigators
const Tab = createBottomTabNavigator();
const HostsStack = createStackNavigator();
const EventsStack = createStackNavigator();
const TicketsStack = createStackNavigator();
const MoreStack = createStackNavigator();

/**
 * Hosts Stack Navigator
 * Contains host management screens
 */
function HostsStackNavigator() {
  const { user } = useAuthStore();
  const userRole = user?.role;

  return (
    <HostsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HostsStack.Screen
        name="AdminHostsList"
        component={AdminHostsScreen}
        options={{
          title: "المضيفون", // Hosts in Arabic
          headerTitle: "Hosts",
        }}
      />
      <HostsStack.Screen
        name="HostDetails"
        component={HostDetailsScreen}
        options={{
          title: "تفاصيل المضيف", // Host Details in Arabic
          headerTitle: "Host Details",
        }}
      />
    </HostsStack.Navigator>
  );
}

/**
 * Events Stack Navigator
 * Contains all event management screens
 */
function EventsStackNavigator() {
  return (
    <EventsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <EventsStack.Screen
        name="AdminEventsList"
        component={AdminEventsScreen}
        options={{
          title: "المناسبات", // Events in Arabic
          headerTitle: "Events",
        }}
      />

      <EventsStack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          title: "تفاصيل المناسبة", // Event Details in Arabic
          headerTitle: "Event Details",
        }}
      />

      <EventsStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: "إنشاء مناسبة", // Create Event in Arabic
          headerTitle: "Create Event",
        }}
      />

      <EventsStack.Screen
        name="UpdateEvent"
        component={UpdateEventScreen}
        options={{
          title: "تعديل مناسبة",
          headerTitle: "Update Event",
        }}
      />
    </EventsStack.Navigator>
  );
}

/**
 * Tickets Stack Navigator
 * Contains all ticket management screens
 */
function TicketsStackNavigator() {
  return (
    <TicketsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <TicketsStack.Screen
        name="AdminTicketsList"
        component={AdminTicketsScreen}
        options={{
          title: "التذاكر", // Tickets in Arabic
          headerTitle: "Tickets",
        }}
      />

      <TicketsStack.Screen
        name="TicketDetails"
        component={TicketDetailsScreen}
        options={{
          title: "تفاصيل التذكرة", // Ticket Details in Arabic
          headerTitle: "Ticket Details",
        }}
      />
    </TicketsStack.Navigator>
  );
}

/**
 * More Stack Navigator
 * Shows a menu screen first, then navigates to sub-screens
 */
function MoreStackNavigator() {
  const { user } = useAuthStore();
  const userRole = user?.role;

  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MoreStack.Screen
        name="AdminMoreMenu"
        component={AdminMoreScreen}
        options={{ headerShown: false }}
      />

      {canViewPage(userRole, PAGES.PAYMENTS) && (
        <MoreStack.Screen
          name="AdminPayments"
          component={AdminPaymentsScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.PAYMENTS) && (
        <MoreStack.Screen
          name="PaymentDetail"
          component={PaymentDetailScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.PLANS) && (
        <MoreStack.Screen
          name="AdminPlans"
          component={AdminPlansScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.SETTINGS) && (
        <MoreStack.Screen
          name="AdminSettings"
          component={AdminSettingsScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.SETTINGS) && (
        <MoreStack.Screen
          name="AdminAccountSettings"
          component={AdminAccountSettingsScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.SETTINGS) && (
        <MoreStack.Screen
          name="AdminNotificationSettings"
          component={AdminNotificationSettingsScreen}
          options={{ headerShown: false }}
        />
      )}

      {canViewPage(userRole, PAGES.MODERATORS) && (
        <MoreStack.Screen
          name="AdminModeratorsList"
          component={AdminModeratorsScreen}
        />
      )}

      {canViewPage(userRole, PAGES.VENDORS) && (
        <MoreStack.Screen
          name="AdminVendorsList"
          component={AdminVendorsScreen}
        />
      )}
      <MoreStack.Screen
        name="VendorDetails"
        component={VendorDetailsScreen}
      />

      {isSuperAdmin(userRole) && (
        <MoreStack.Screen
          name="AdminWhitelabelsList"
          component={AdminWhitelabelsScreen}
        />
      )}
      {isSuperAdmin(userRole) && (
        <MoreStack.Screen
          name="WhitelabelDetails"
          component={WhitelabelDetailsScreen}
        />
      )}

      {canViewPage(userRole, PAGES.DISCOUNTS) && (
        <MoreStack.Screen
          name="AdminDiscounts"
          component={AdminDiscountsScreen}
          options={{ headerShown: false }}
        />
      )}

      {canViewPage(userRole, PAGES.TEMPLATES) && (
        <MoreStack.Screen
          name="AdminTemplates"
          component={AdminTemplatesScreen}
          options={{ headerShown: false }}
        />
      )}

      {canViewPage(userRole, PAGES.PLANS) && (
        <MoreStack.Screen
          name="WhitelabelPlans"
          component={WhitelabelPlansScreen}
          options={{ headerShown: false }}
        />
      )}
      {canViewPage(userRole, PAGES.PLANS) && (
        <MoreStack.Screen
          name="WhitelabelPlansSummary"
          component={WhitelabelPlansSummaryScreen}
          options={{ headerShown: false }}
        />
      )}
    </MoreStack.Navigator>
  );
}

/**
 * Get tab bar icon
 */
function getTabBarIcon(routeName, focused, color, size) {
  let iconName;

  switch (routeName) {
    case "Dashboard":
      iconName = focused ? "grid" : "grid-outline";
      break;
    case "Hosts":
      iconName = focused ? "people" : "people-outline";
      break;
    case "Events":
      iconName = focused ? "calendar" : "calendar-outline";
      break;
    case "Tickets":
      iconName = focused ? "chatbubbles" : "chatbubbles-outline";
      break;
    case "More":
      iconName = focused
        ? "ellipsis-horizontal"
        : "ellipsis-horizontal-outline";
      break;
    default:
      iconName = "help-outline";
  }

  return <Ionicons name={iconName} size={size} color={color} />;
}

/**
 * Main Admin Navigator
 * Bottom tab navigator with role-based filtering
 */
export default function AdminNavigator() {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const { t } = useTranslation("common");

  // Get navigation items filtered by role
  const navItems = getNavItemsForRole(userRole);

  // Check which tabs should be visible
  const showDashboard = canViewPage(userRole, PAGES.DASHBOARD);
  const showHosts = canViewPage(userRole, PAGES.HOSTS);
  const showEvents = canViewPage(userRole, PAGES.EVENTS);
  const showTickets = canViewPage(userRole, PAGES.TICKETS);
  const showMore =
    canViewPage(userRole, PAGES.PAYMENTS) ||
    canViewPage(userRole, PAGES.PLANS) ||
    canViewPage(userRole, PAGES.SETTINGS) ||
    canViewPage(userRole, PAGES.MODERATORS) ||
    canViewPage(userRole, PAGES.VENDORS) ||
    canViewPage(userRole, PAGES.WHITELABELS) ||
    canViewPage(userRole, PAGES.TEMPLATES);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route.name, focused, color, size),
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.natural[450],
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
      {showDashboard && (
        <Tab.Screen
          name="Dashboard"
          component={AdminDashboardScreen}
          options={{
            tabBarLabel: t("navigation.dashboard"),
            headerShown: false,
          }}
        />
      )}

      {showHosts && (
        <Tab.Screen
          name="Hosts"
          component={HostsStackNavigator}
          options={{
            tabBarLabel: t("navigation.hosts"),
            headerShown: false,
          }}
        />
      )}

      {showEvents && (
        <Tab.Screen
          name="Events"
          component={EventsStackNavigator}
          options={{
            tabBarLabel: t("navigation.events"),
            headerShown: false,
          }}
        />
      )}

      {showTickets && (
        <Tab.Screen
          name="Tickets"
          component={TicketsStackNavigator}
          options={{
            tabBarLabel: t("navigation.tickets"),
            headerShown: false,
          }}
        />
      )}

      {showMore && (
        <Tab.Screen
          name="More"
          component={MoreStackNavigator}
          options={{
            tabBarLabel: t("navigation.more"),
            headerShown: false,
          }}
        />
      )}
    </Tab.Navigator>
  );
}
