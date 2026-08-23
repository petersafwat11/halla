/**
 * Session 3 Verification Suite:
 * Canonical Filters, Query Keys Parity, and SSR Hydration
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAdminFilters,
  normalizeDashboardFilters,
  normalizeDiscountsFilters,
  normalizeTicketsFilters,
  normalizePaymentsFilters,
} from "../../utils/filterNormalizer.js";
import { adminKeys } from "../../hooks/admin/keys.js";
import { discountsKeys } from "../../hooks/discounts/keys.js";
import { ticketsKeys } from "../../hooks/tickets/keys.js";

describe("Session 3: Canonical Filter Normalizer Table-Driven Tests", () => {
  it("normalizes empty/missing inputs to standard defaults without undefined pollution", () => {
    const fromEmptyObj = normalizeAdminFilters({});
    const fromNull = normalizeAdminFilters(null);
    const fromUndefined = normalizeAdminFilters(undefined);
    const fromEmptyParams = normalizeAdminFilters(new URLSearchParams(""));

    const expected = { page: 1, limit: 10 };
    assert.deepEqual(fromEmptyObj, expected);
    assert.deepEqual(fromNull, expected);
    assert.deepEqual(fromUndefined, expected);
    assert.deepEqual(fromEmptyParams, expected);
  });

  it("strips empty strings, nulls, undefined, and whitespace from optional fields", () => {
    const inputWithJunk = {
      page: "1",
      limit: "10",
      search: "   ",
      status: "",
      from: null,
      to: undefined,
    };

    const normalized = normalizeAdminFilters(inputWithJunk);
    assert.deepEqual(normalized, { page: 1, limit: 10 });
    assert.equal("search" in normalized, false);
    assert.equal("status" in normalized, false);
    assert.equal("from" in normalized, false);
    assert.equal("to" in normalized, false);
  });

  it("handles malformed pagination inputs safely with fallbacks", () => {
    const malformed = {
      page: "invalid",
      limit: "-100",
    };

    const normalized = normalizeAdminFilters(malformed, { limit: 20 });
    assert.deepEqual(normalized, { page: 1, limit: 20 });
  });

  it("preserves valid populated search, status, and date filters", () => {
    const params = new URLSearchParams("page=3&limit=25&search=alpha&status=active&from=2026-01-01&to=2026-02-01");
    const normalized = normalizeAdminFilters(params);

    assert.deepEqual(normalized, {
      page: 3,
      limit: 25,
      search: "alpha",
      status: "active",
      from: "2026-01-01",
      to: "2026-02-01",
    });
  });

  it("discounts normalizer correctly derives isActive boolean and strips empty fields", () => {
    const activeParams = new URLSearchParams("status=active");
    const inactiveParams = new URLSearchParams("status=inactive");
    const allParams = new URLSearchParams("");

    assert.deepEqual(normalizeDiscountsFilters(activeParams), {
      page: 1,
      limit: 20,
      status: "active",
      isActive: true,
    });

    assert.deepEqual(normalizeDiscountsFilters(inactiveParams), {
      page: 1,
      limit: 20,
      status: "inactive",
      isActive: false,
    });

    assert.deepEqual(normalizeDiscountsFilters(allParams), {
      page: 1,
      limit: 20,
    });
  });

  it("dashboard normalizer preserves period and valid date bounds", () => {
    const defaultDash = normalizeDashboardFilters({});
    assert.deepEqual(defaultDash, { period: "month" });

    const customDash = normalizeDashboardFilters(new URLSearchParams("period=year&from=2026-01-01&to=2026-12-31"));
    assert.deepEqual(customDash, {
      period: "year",
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });
});

describe("Session 3: SSR Hydration & Query Key Byte-Parity Matrix", () => {
  it("Hosts: Server prefetch, Table, and Stats produce identical query keys for default URL", () => {
    const serverUrlParams = {};
    const clientTableParams = new URLSearchParams("");
    const clientStatsParams = new URLSearchParams("");

    const serverFilters = normalizeAdminFilters(serverUrlParams, { limit: 10 });
    const tableFilters = normalizeAdminFilters(clientTableParams, { limit: 10 });
    const statsFilters = normalizeAdminFilters(clientStatsParams, { limit: 10 });

    const serverKey = adminKeys.hosts(serverFilters);
    const tableKey = adminKeys.hosts(tableFilters);
    const statsKey = adminKeys.hosts(statsFilters);

    assert.deepEqual(serverKey, tableKey);
    assert.deepEqual(tableKey, statsKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(tableKey));
    assert.equal(JSON.stringify(tableKey), JSON.stringify(statsKey));
  });

  it("Businesses: Server prefetch, Table, and Stats produce identical query keys for filtered URL", () => {
    const rawQuery = "page=2&search=acme&status=active";
    const serverUrlParams = { page: "2", search: "acme", status: "active" };
    const clientTableParams = new URLSearchParams(rawQuery);
    const clientStatsParams = new URLSearchParams(rawQuery);

    const serverFilters = normalizeAdminFilters(serverUrlParams, { limit: 10 });
    const tableFilters = normalizeAdminFilters(clientTableParams, { limit: 10 });
    const statsFilters = normalizeAdminFilters(clientStatsParams, { limit: 10 });

    const serverKey = adminKeys.businesses(serverFilters);
    const tableKey = adminKeys.businesses(tableFilters);
    const statsKey = adminKeys.businesses(statsFilters);

    assert.deepEqual(serverKey, tableKey);
    assert.deepEqual(tableKey, statsKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(tableKey));
  });

  it("Events: Server prefetch, Table, and Stats produce identical query keys", () => {
    const rawQuery = "page=1&status=live";
    const serverUrlParams = { page: "1", status: "live" };
    const clientParams = new URLSearchParams(rawQuery);

    const serverFilters = normalizeAdminFilters(serverUrlParams, { limit: 10 });
    const clientFilters = normalizeAdminFilters(clientParams, { limit: 10 });

    const serverKey = adminKeys.adminEventsList(serverFilters);
    const tableKey = adminKeys.adminEventsList(clientFilters);

    assert.deepEqual(serverKey, tableKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(tableKey));
  });

  it("Discounts: Server prefetch, Table, and Stats produce identical query keys", () => {
    const serverUrlParams = { status: "active" };
    const clientParams = new URLSearchParams("status=active");

    const serverFilters = normalizeDiscountsFilters(serverUrlParams, { limit: 20 });
    const clientFilters = normalizeDiscountsFilters(clientParams, { limit: 20 });

    const serverKey = discountsKeys.adminList(serverFilters);
    const clientKey = discountsKeys.adminList(clientFilters);

    assert.deepEqual(serverKey, clientKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(clientKey));
  });

  it("Tickets: Server prefetch, Table, and Stats produce identical query keys", () => {
    const serverUrlParams = { priority: "high", status: "open" };
    const clientParams = new URLSearchParams("priority=high&status=open");

    const serverFilters = normalizeTicketsFilters(serverUrlParams, { limit: 10 });
    const clientFilters = normalizeTicketsFilters(clientParams, { limit: 10 });

    const serverKey = ticketsKeys.myTickets(serverFilters);
    const clientKey = ticketsKeys.myTickets(clientFilters);

    assert.deepEqual(serverKey, clientKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(clientKey));
  });

  it("Payments: Server prefetch, Table, and Stats produce identical query keys", () => {
    const serverUrlParams = {};
    const clientParams = new URLSearchParams("");

    const serverFilters = normalizePaymentsFilters(serverUrlParams, { limit: 20 });
    const clientFilters = normalizePaymentsFilters(clientParams, { limit: 20 });

    const serverKey = adminKeys.payments(serverFilters);
    const clientKey = adminKeys.payments(clientFilters);

    assert.deepEqual(serverKey, clientKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(clientKey));
  });

  it("Dashboard: Server prefetch, Stats, Charts, and Activity produce identical query keys", () => {
    const serverUrlParams = { period: "month" };
    const clientParams = new URLSearchParams("");

    const serverFilters = normalizeDashboardFilters(serverUrlParams);
    const clientFilters = normalizeDashboardFilters(clientParams);

    const serverKey = adminKeys.dashboard(serverFilters);
    const clientKey = adminKeys.dashboard(clientFilters);

    assert.deepEqual(serverKey, clientKey);
    assert.equal(JSON.stringify(serverKey), JSON.stringify(clientKey));
  });
});
