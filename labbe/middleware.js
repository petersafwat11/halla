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
  "/forget-password",
  "/change-password",
];

// Routes that require authentication
const PROTECTED_ROUTES = {
  host: "/host",
  admin: "/admin-dash",
  vendor: "/vendor-dashboard",
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
 * Get redirect path based on user role
 */
const getRedirectPath = (role) => {
  if (isMainAdminRole(role)) return PROTECTED_ROUTES.admin;
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
  // `userType` is a JS-readable routing hint set by js-cookie on this origin
  // after every successful login. We use it (not access_token) as the session
  // signal because access_token is an HttpOnly cookie set by the backend on a
  // different port in dev (:8000) — Chrome stores cross-origin CORS cookies
  // keyed to the response origin, so the middleware at :3000 never sees it.
  // Security is not affected: the backend verifies the JWT on every API call;
  // the middleware only drives UI routing, not data access control.
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
  const isProtectedRoute =
    isHostRoute || isAdminRoute || isVendorDashRoute;

  // Special routes
  const isContinueSignup = routePath.startsWith("/signup/continue-signup");
  const isVendorPublicRoute =
    routePath === "/vendor" ||
    (routePath.startsWith("/vendor/") &&
      !routePath.startsWith("/vendor-dashboard"));

  // If user is authenticated and tries to access the landing page, auto-redirect to dashboard
  if (userType && (routePath === "/" || routePath === "")) {
    const redirectPath = getRedirectPath(userType);
    return NextResponse.redirect(
      new URL(`/${locale}${redirectPath}`, request.url)
    );
  }

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

  if (userType) {
    // User is logged in

    // Business accounts provisioned by an admin may be flagged
    // `mustChangePassword`. Force them onto the change-password screen and
    // block every other route until they rotate the temporary password. The
    // server also enforces this (403 PASSWORD_CHANGE_REQUIRED); this is just a
    // graceful client-side route. The cookie is cleared after a successful
    // password update (see hooks/users/mutations.js → updatePassword).
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
      // Admin routes - only platform admin roles
      if (isAdminRoute && !isMainAdminRole(userType)) {
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
    // `.well-known` is excluded so the i18n router doesn't redirect the
    // universal/app-link association files (Apple/Google fetch them at the
    // exact path with no redirects allowed).
    "/((?!api|_next/static|_next/image|favicon.ico|public|assets|svg|robots.txt|sitemap.xml|.well-known).*)",
  ],
};
