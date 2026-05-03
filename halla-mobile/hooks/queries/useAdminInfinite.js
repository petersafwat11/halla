/**
 * Phase 4 W3-PAGE — infinite-query variants of the admin list hooks.
 *
 * Each hook wraps `useInfiniteQuery` so the screens can switch from a
 * "fetch first 20 then stop" pattern to FlatList `onEndReached`-driven
 * pagination. Page size is 20 across the board (master plan D5).
 *
 * Each hook returns a flattened helper API:
 *
 *   const { items, isLoading, isFetchingNextPage, hasNextPage,
 *           fetchNextPage, refetch, error } = useAdminHostsInfinite();
 *
 * Backend contract (admin.controller.js): the response envelope is
 *   {
 *     success: true,
 *     status: ...,
 *     data: { hosts: [...], pagination: { page, totalPages, hasMore, ... } }
 *   }
 *
 * `pagination.hasMore` is the canonical "is there a next page" flag.
 * When absent we fall back to "did this page return `limit` rows?".
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import adminDashboardService from "../../services/adminDashboardService";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Internal helper: collapse the nested envelope shapes admin endpoints
 * return into a normalized `{ items, hasMore }` per page.
 *
 * Admin endpoints wrap responses as `{ success, data: <rows or { collection: [...], pagination } > }`.
 * Different endpoints use different collection keys (`hosts`, `vendors`,
 * `events`, `tickets`, `whitelabels`, `payments`, `moderators`).
 */
const _normalizePage = (response, collectionKey, limit) => {
  const envelope = response?.data?.data ?? response?.data ?? {};
  const items = Array.isArray(envelope[collectionKey])
    ? envelope[collectionKey]
    : Array.isArray(envelope.data)
      ? envelope.data
      : Array.isArray(envelope)
        ? envelope
        : [];
  const pagination = envelope.pagination || envelope.meta || null;
  let hasMore = false;
  if (pagination) {
    if (typeof pagination.hasMore === "boolean") {
      hasMore = pagination.hasMore;
    } else if (typeof pagination.totalPages === "number" && typeof pagination.page === "number") {
      hasMore = pagination.page < pagination.totalPages;
    } else if (typeof pagination.total === "number" && typeof pagination.page === "number") {
      hasMore = pagination.page * limit < pagination.total;
    }
  } else {
    hasMore = items.length >= limit;
  }
  return { items, hasMore };
};

const _flattenPages = (data) => {
  if (!data?.pages) return [];
  return data.pages.flatMap((p) => p?.items || []);
};

const _buildInfinite = ({
  queryKey,
  fetchPage,
  collectionKey,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
  staleTime = 2 * 60 * 1000,
}) => {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchPage({ page: pageParam, limit });
      const normalized = _normalizePage(response, collectionKey, limit);
      return { ...normalized, page: pageParam };
    },
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime,
  });

  return {
    items: _flattenPages(query.data),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
};

/**
 * Returns a flat list of hosts paginated via the admin endpoint.
 * @param {Object} [filters] - Filter params merged into the query string
 *   (search/status/from/to/etc.)
 */
export function useAdminHostsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "hosts", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.hosts.getAll(token, { ...filters, page, limit }),
    collectionKey: "hosts",
    enabled: !!token,
  });
}

export function useAdminVendorsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "vendors", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.vendors.getAll(token, { ...filters, page, limit }),
    collectionKey: "vendors",
    enabled: !!token,
  });
}

export function useAdminEventsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "events", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.events.getAll(token, { ...filters, page, limit }),
    collectionKey: "events",
    enabled: !!token,
  });
}

export function useAdminTicketsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "tickets", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.tickets.getAll(token, { ...filters, page, limit }),
    collectionKey: "tickets",
    enabled: !!token,
  });
}

export function useAdminWhitelabelsInfinite(filters = {}, opts = {}) {
  const token = useAuthStore((state) => state.token);
  const callerEnabled = opts.enabled !== false;
  return _buildInfinite({
    queryKey: ["admin", "whitelabels", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.whitelabels.getAll(token, { ...filters, page, limit }),
    collectionKey: "whitelabels",
    enabled: !!token && callerEnabled,
  });
}

export function useAdminPaymentsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "payments", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.payments.getAll(token, { ...filters, page, limit }),
    collectionKey: "payments",
    enabled: !!token,
  });
}

export function useAdminModeratorsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return _buildInfinite({
    queryKey: ["admin", "moderators", "infinite", filters],
    fetchPage: ({ page, limit }) =>
      adminDashboardService.moderators.getAll(token, { ...filters, page, limit }),
    collectionKey: "moderators",
    enabled: !!token,
  });
}
