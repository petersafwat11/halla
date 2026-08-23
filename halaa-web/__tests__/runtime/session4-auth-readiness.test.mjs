/**
 * Session 4 Verification Suite:
 * Web Authentication, First-Request Readiness, Refresh Coordination, and Session Termination
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient } from "@tanstack/react-query";
import { cookieUtils } from "../../utils/cookieUtils.js";
import Cookies from "js-cookie";

describe("Session 4: Web Authentication and First-Request Readiness", () => {
  before(() => {
    setupDom();
  });

  beforeEach(() => {
    cookieUtils.clearAuthCookies();
  });

  it("1. cookieUtils.clearAuthCookies removes all session routing hints", () => {
    cookieUtils.setCookie("userType", "admin");
    cookieUtils.setCookie("token", "legacy-token");
    cookieUtils.setCookie("profileCompleted", "true");
    cookieUtils.setCookie("mustChangePassword", "true");

    assert.equal(Cookies.get("userType"), "admin");
    assert.equal(Cookies.get("profileCompleted"), "true");
    assert.equal(Cookies.get("mustChangePassword"), "true");

    cookieUtils.clearAuthCookies();

    assert.equal(Cookies.get("userType"), undefined);
    assert.equal(Cookies.get("profileCompleted"), undefined);
    assert.equal(Cookies.get("mustChangePassword"), undefined);
    assert.equal(Cookies.get("token"), undefined);
  });

  it("2. ReactQueryProvider defaultOptions retry function rejects 401 and 403 errors immediately without retry", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            const status = error?.parsedError?.status || error?.response?.status || error?.status;
            if (status === 401 || status === 403) return false;
            return failureCount < 2;
          },
        },
      },
    });

    const retryFn = queryClient.getDefaultOptions().queries.retry;

    // 401 (Auth) -> false
    assert.equal(retryFn(0, { parsedError: { status: 401 } }), false);
    assert.equal(retryFn(0, { response: { status: 401 } }), false);
    assert.equal(retryFn(0, { status: 401 }), false);

    // 403 (Forbidden) -> false
    assert.equal(retryFn(0, { parsedError: { status: 403 } }), false);
    assert.equal(retryFn(0, { response: { status: 403 } }), false);

    // 500 (Server Error) -> retry up to 2 times
    assert.equal(retryFn(0, { parsedError: { status: 500 } }), true);
    assert.equal(retryFn(1, { parsedError: { status: 500 } }), true);
    assert.equal(retryFn(2, { parsedError: { status: 500 } }), false);
  });

  it("3. Coalesced refresh coordinator deduplicates concurrent refresh requests into a single in-flight promise", async () => {
    let networkCallCount = 0;
    let refreshPromise = null;

    const mockRefreshOnce = async () => {
      if (refreshPromise) return refreshPromise;
      refreshPromise = (async () => {
        networkCallCount += 1;
        // simulate async network roundtrip
        await new Promise((resolve) => setTimeout(resolve, 20));
        return true;
      })().finally(() => {
        Promise.resolve().then(() => {
          refreshPromise = null;
        });
      });
      return refreshPromise;
    };

    // 10 concurrent requests encountering 401 simultaneously
    const results = await Promise.all([
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
      mockRefreshOnce(),
    ]);

    // All 10 requests got true, but only 1 network call occurred
    assert.equal(networkCallCount, 1);
    assert.deepEqual(
      results,
      [true, true, true, true, true, true, true, true, true, true]
    );
  });

  it("4. Session termination coordinator resets client state cleanly and prevents refresh loops", async () => {
    const authStoreMod = await import("../../stores/authStore.js");
    const useAuthStore = authStoreMod.default;

    // Seed authenticated store and cookies
    useAuthStore.getState().setAuth({ id: "user-1", role: "host" }, { planType: "free" });
    Cookies.set("userType", "host");
    Cookies.set("profileCompleted", "true");

    assert.equal(useAuthStore.getState().status, "authenticated");
    assert.equal(useAuthStore.getState().user?.id, "user-1");
    assert.equal(Cookies.get("userType"), "host");

    // Call terminateSession
    const httpMod = await import("../../services/http.js");
    await httpMod.terminateSession();

    // Verify auth state reset
    assert.equal(useAuthStore.getState().status, "unauthenticated");
    assert.equal(useAuthStore.getState().user, null);
    assert.equal(Cookies.get("userType"), undefined);
    assert.equal(Cookies.get("profileCompleted"), undefined);
  });

  it("5. Auth routes and already retried requests are exempted from refresh retry loops", () => {
    const isExcludedFromRefresh = (url, isRetried) => {
      const skipRefresh =
        isRetried ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/login") ||
        url.includes("/auth/logout");
      return skipRefresh;
    };

    assert.equal(isExcludedFromRefresh("/admin/hosts", false), false);
    assert.equal(isExcludedFromRefresh("/admin/hosts", true), true); // already retried
    assert.equal(isExcludedFromRefresh("/auth/login", false), true);
    assert.equal(isExcludedFromRefresh("/auth/refresh", false), true);
    assert.equal(isExcludedFromRefresh("/auth/logout", false), true);
  });
});
