/**
 * Infinite-query variants of the admin list hooks.
 * Each hook wraps `useInfiniteQuery` for FlatList `onEndReached`-driven
 * pagination (page size 20). Returns { items, isLoading, isFetchingNextPage,
 * hasNextPage, fetchNextPage, refetch, error }.
 *
 * Backend endpoints return two shapes — both handled by `_normalizePage`:
 *   - `sendSuccess(res, { hosts, pagination })` — object-envelope (admin endpoints)
 *   - `sendPaginated(res, array, pagination)` — array + sibling pagination
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { useAuthStore } from "../../stores/authStore";
import { adminQs, adminRequest } from "./_request";
import { adminKeys } from "./keys";

const DEFAULT_PAGE_SIZE = 20;

const _normalizePage = (response, collectionKey, limit) => {
  const inner = response?.data?.data ?? response?.data ?? {};
  const outer = response?.data ?? {};

  // Tickets (`sendPaginated`) lands as `outer.data === array`, so `inner` is the array.
  // Other admin endpoints (`sendSuccess`) land as `inner === { [collectionKey], pagination }`.
  const items = Array.isArray(inner)
    ? inner
    : Array.isArray(inner?.[collectionKey])
      ? inner[collectionKey]
      : [];

  const pagination = inner?.pagination || outer?.pagination || null;

  let hasMore = false;
  if (pagination) {
    if (typeof pagination.hasMore === "boolean") {
      hasMore = pagination.hasMore;
    } else if (typeof pagination.totalPages === "number" && typeof pagination.page === "number") {
      hasMore = pagination.page < pagination.totalPages;
    } else if (typeof pagination.pages === "number" && typeof pagination.page === "number") {
      // Backend uses `pages` (Math.ceil(total / limit)) on most admin endpoints.
      hasMore = pagination.page < pagination.pages;
    } else if (typeof pagination.total === "number" && typeof pagination.page === "number") {
      const pageLimit = pagination.limit || limit;
      hasMore = pagination.page * pageLimit < pagination.total;
    } else {
      hasMore = items.length >= limit;
    }
  } else {
    hasMore = items.length >= limit;
  }

  // Preserve stats (e.g. payments endpoint returns stats alongside paginated list).
  const stats = inner?.stats || outer?.stats || null;

  return { items, hasMore, stats };
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
    stats: query.data?.pages?.[0]?.stats || null,
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
 * Drop empty / "all" / undefined values from a filters object so the
 * query key stays stable. Without this, `{ status: undefined }` and
 * `{}` would key separately.
 */
const _normalizeFilters = (filters = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    out[key] = value;
  }
  return out;
};

export function useAdminHostsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.hostsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.HOSTS.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "hosts",
    enabled: !!token,
  });
}

export function useAdminBusinessesInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.businessesInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.BUSINESSES.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "businesses",
    enabled: !!token,
  });
}

export function useAdminVendorsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.vendorsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.VENDORS.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "vendors",
    enabled: !!token,
  });
}

export function useAdminEventsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.eventsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.EVENTS.ADMIN_ALL}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "events",
    enabled: !!token,
  });
}

export function useAdminTicketsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.ticketsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.TICKETS.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "tickets",
    enabled: !!token,
  });
}

export function useAdminPaymentsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.paymentsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.PAYMENTS.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "payments",
    enabled: !!token,
  });
}

export function useAdminModeratorsInfinite(filters = {}) {
  const token = useAuthStore((state) => state.token);
  const cleanFilters = _normalizeFilters(filters);
  return _buildInfinite({
    queryKey: adminKeys.moderatorsInfinite(cleanFilters),
    fetchPage: ({ page, limit }) =>
      adminRequest(
        `${ENDPOINTS.ADMIN.MODERATORS.BASE}${adminQs({ ...cleanFilters, page, limit })}`,
      ),
    collectionKey: "moderators",
    enabled: !!token,
  });
}
