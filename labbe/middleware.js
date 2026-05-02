import { NextResponse } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nRouterConfig } from "./localization/i18nRouterConfig";

// ============================================
// USER ROLES (matching backend)
// ============================================

const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  WHITELABEL_ADMIN: "whitelabel_admin",
  WHITELABEL_MODERATOR: "whitelabel_moderator",
  HOST: "host",
  VENDOR: "vendor",
};

// ============================================
// ROUTE DEFINITIONS
// ============================================

// Public auth routes (accessible without login)
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/signup/vendor",
  "/signup/whitelabel",
  "/forget-password",
  "/change-password",
];

// Routes that require authentication
const PROTECTED_ROUTES = {
  host: "/host",
  admin: "/admin-dash",
  vendor: "/vendor-dashboard",
  whitelabel: "/whitelabel-dash",
};

// Public routes (no auth required)
const PUBLIC_ROUTES = ["/", "/vendor", "/about", "/contact", "/pricing"];

// Routes for profile completion
const PROFILE_COMPLETION_ROUTE = "/signup/continue-signup";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if role is a main platform admin role
 */
const isMainAdminRole = (role) => {
  return [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MODERATOR,
  ].includes(role);
};

/**
 * Check if role is a whitelabel role
 */
const isWhitelabelRole = (role) => {
  return [
    USER_ROLES.WHITELABEL_ADMIN,
    USER_ROLES.WHITELABEL_MODERATOR,
  ].includes(role);
};

/**
 * Check if role can access admin dashboard (both main admins and whitelabel)
 * All admin-type roles now use admin-dash with role-based filtering
 */
const canAccessAdminDash = (role) => {
  return isMainAdminRole(role) || isWhitelabelRole(role);
};

/**
 * Get redirect path based on user role
 * NOTE: Whitelabel users now redirect to admin-dash (unified dashboard)
 */
const getRedirectPath = (role) => {
  // Both main admins and whitelabel users go to admin-dash
  if (canAccessAdminDash(role)) return PROTECTED_ROUTES.admin;
  if (role === USER_ROLES.VENDOR) return PROTECTED_ROUTES.vendor;
  if (role === USER_ROLES.HOST) return PROTECTED_ROUTES.host;
  return "/";
};

const isRouteMatch = (routePath, routes) => {
  return routes.some(
    (route) => routePath === route || routePath.startsWith(`${route}/`)
  );
};

// ============================================
// MIDDLEWARE
// ============================================

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const userType = request.cookies.get("userType")?.value;

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    request.method === "OPTIONS"
  ) {
    return NextResponse.next();
  }

  // Parse locale from path
  const segments = pathname.split("/").filter(Boolean);
  const isValidLocale =
    segments[0] && i18nRouterConfig.locales.includes(segments[0]);
  const locale = isValidLocale ? segments[0] : i18nRouterConfig.defaultLocale;

  // Get route path without locale
  const routePath = isValidLocale
    ? `/${segments.slice(1).join("/")}`
    : pathname;

  // Check route types
  const isAuthRoute = isRouteMatch(routePath, AUTH_ROUTES);
  const isPublicRoute = isRouteMatch(routePath, PUBLIC_ROUTES);
  const isHostRoute = routePath.startsWith(PROTECTED_ROUTES.host);
  const isAdminRoute = routePath.startsWith(PROTECTED_ROUTES.admin);
  const isVendorDashRoute = routePath.startsWith(PROTECTED_ROUTES.vendor);
  const isWhitelabelRoute = routePath.startsWith(PROTECTED_ROUTES.whitelabel);
  const isProtectedRoute =
    isHostRoute || isAdminRoute || isVendorDashRoute || isWhitelabelRoute;

  // Special routes
  const isContinueSignup = routePath.startsWith("/signup/continue-signup");
  const isVendorPublicRoute =
    routePath === "/vendor" ||
    (routePath.startsWith("/vendor/") &&
      !routePath.startsWith("/vendor-dashboard"));

  // Allow public routes without auth
  if (
    routePath === "/" ||
    routePath === "" ||
    isPublicRoute ||
    isVendorPublicRoute
  ) {
    return i18nRouter(request, i18nRouterConfig);
  }

  // ============================================
  // AUTHENTICATION LOGIC
  // ============================================

  if (token && userType) {
    // User is logged in

    // Check if user profile is complete (from cookie set during login)
    const profileCompleted = request.cookies.get("profileCompleted")?.value;

    // If profile is not complete and user is a host, redirect to complete profile
    // Exception: already on continue-signup page
    if (
      profileCompleted === "false" &&
      userType === USER_ROLES.HOST &&
      !isContinueSignup
    ) {
      return NextResponse.redirect(
        new URL(`/${locale}${PROFILE_COMPLETION_ROUTE}`, request.url)
      );
    }

    // Redirect from auth routes to appropriate dashboard (except continue-signup)
    if (isAuthRoute && !isContinueSignup) {
      const redirectPath = getRedirectPath(userType);
      return NextResponse.redirect(
        new URL(`/${locale}${redirectPath}`, request.url)
      );
    }

    // Check role-based access to protected routes
    if (isProtectedRoute) {
      // Admin routes - allow both main admins AND whitelabel roles
      // Whitelabel users now use admin-dash with role-based nav filtering
      if (isAdminRoute && !canAccessAdminDash(userType)) {
        return NextResponse.redirect(
          new URL(`/${locale}${getRedirectPath(userType)}`, request.url)
        );
      }

      // Host routes - only hosts
      if (isHostRoute && userType !== USER_ROLES.HOST) {
        return NextResponse.redirect(
          new URL(`/${locale}${getRedirectPath(userType)}`, request.url)
        );
      }

      // Vendor dashboard - only vendors
      if (isVendorDashRoute && userType !== USER_ROLES.VENDOR) {
        return NextResponse.redirect(
          new URL(`/${locale}${getRedirectPath(userType)}`, request.url)
        );
      }

      // Whitelabel routes - redirect to admin-dash (unified dashboard)
      // Whitelabel users should use admin-dash now
      if (isWhitelabelRoute) {
        // Redirect whitelabel-dash to admin-dash
        const newPath = routePath.replace("/whitelabel-dash", "/admin-dash");
        return NextResponse.redirect(
          new URL(`/${locale}${newPath}`, request.url)
        );
      }
    }
  } else {
    // User is NOT logged in

    // Redirect from protected routes to login
    if (isProtectedRoute) {
      const returnUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(`/${locale}/login?returnUrl=${returnUrl}`, request.url)
      );
    }

    // Continue-signup requires authentication
    if (isContinueSignup) {
      return NextResponse.redirect(new URL(`/${locale}/signup`, request.url));
    }
  }

  // Handle i18n routing for all other cases
  return i18nRouter(request, i18nRouterConfig);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public|assets|svg|robots.txt|sitemap.xml).*)",
  ],
};
