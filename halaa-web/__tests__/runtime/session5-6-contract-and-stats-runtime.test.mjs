/**
 * Session 5 & 6 Client Verification Suite:
 * Admin Statistics Component Correctness, Multi-Page Aggregations & Zero/Empty State Resiliency
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminKeys } from "../../hooks/admin/keys.js";
import { discountsKeys } from "../../hooks/discounts/keys.js";
import { ticketsKeys } from "../../hooks/tickets/keys.js";
import {
  normalizeAdminFilters,
  normalizeDiscountsFilters,
  normalizePaymentsFilters,
  normalizeTicketsFilters,
} from "../../utils/filterNormalizer.js";

import HostStats from "../../app/[lang]/admin-dash/hosts/_components/HostStats.jsx";
import BusinessStats from "../../app/[lang]/admin-dash/businesses/_components/BusinessStats.jsx";
import VendorStats from "../../app/[lang]/admin-dash/vendors/_components/VendorStats.jsx";
import ModeratorStats from "../../app/[lang]/admin-dash/moderators/_components/ModeratorStats.jsx";
import EventStats from "../../app/[lang]/admin-dash/events/_components/EventStats.jsx";
import DiscountsStats from "../../app/[lang]/admin-dash/discounts/_components/DiscountsStats.jsx";
import PaymentStats from "../../app/[lang]/admin-dash/payments/_components/PaymentStats.jsx";
import TicketStats from "../../app/[lang]/admin-dash/tickets/_components/TicketStats.jsx";

const renderWithQueryClient = (ui, queryClient) => {
  return renderToString(
    React.createElement(QueryClientProvider, { client: queryClient }, ui)
  );
};

describe("Session 5 & 6: Admin Statistics Components & Authoritative Envelopes", () => {
  before(() => {
    setupDom();
  });

  it("1. DiscountsStats renders authoritative full-dataset counts from stats object, not local page array (WEB-12)", () => {
    const queryClient = new QueryClient();
    const filters = normalizeDiscountsFilters(new URLSearchParams(), { limit: 20 });

    // 2 items on page 1, but stats indicates 150 total, 120 active, 15 expired, 450 totalUsed
    queryClient.setQueryData(
      discountsKeys.adminList(filters),
      {
        data: [{ id: "1", isActive: true }, { id: "2", isActive: true }],
        pagination: { total: 150, page: 1, limit: 20 },
        stats: { total: 150, active: 120, expired: 15, totalUsed: 450 },
      }
    );

    const html = renderWithQueryClient(React.createElement(DiscountsStats), queryClient);
    assert.ok(html.includes("150"), "Total codes must be 150");
    assert.ok(html.includes("120"), "Active codes must be 120 (from stats, not page array 2)");
    assert.ok(html.includes("15"), "Expired codes must be 15");
    assert.ok(html.includes("450"), "Total usages must be 450");
    assert.ok(!html.includes("NaN"), "HTML must never contain NaN");
  });

  it("2. PaymentStats renders revenue and counts from backend stats object (WEB-13)", () => {
    const queryClient = new QueryClient();
    const filters = normalizePaymentsFilters(new URLSearchParams(), { limit: 20 });

    queryClient.setQueryData(
      adminKeys.payments(filters),
      {
        data: {
          payments: [{ _id: "p1", amount: 500 }],
          pagination: { total: 42, page: 1, limit: 20 },
          stats: {
            totalRevenue: 25400,
            completed: 30,
            pending: 8,
            failed: 4,
          },
        },
      }
    );

    const html = renderWithQueryClient(React.createElement(PaymentStats), queryClient);
    assert.ok(html.includes("30"), "Completed count must be 30");
    assert.ok(html.includes("8"), "Pending count must be 8");
    assert.ok(html.includes("4"), "Failed count must be 4");
    assert.ok(!html.includes("NaN"), "HTML must never contain NaN");
  });

  it("3. EventStats renders authoritative statusCounts and handles zero counts (WEB-10, WEB-11)", () => {
    const queryClient = new QueryClient();
    const filters = normalizeAdminFilters(new URLSearchParams(), { limit: 10 });

    queryClient.setQueryData(
      adminKeys.adminEventsList(filters),
      {
        data: [{ _id: "e1" }],
        statusCounts: {
          total: 85,
          live: 12,
          scheduled: 40,
          completed: 33,
        },
        pagination: { total: 85, page: 1, limit: 10 },
      }
    );

    const html = renderWithQueryClient(React.createElement(EventStats), queryClient);
    assert.ok(html.includes("85"), "Total events must be 85");
    assert.ok(html.includes("52"), "Active events must be 52 (live 12 + scheduled 40)");
    assert.ok(html.includes("40"), "Scheduled events must be 40");
    assert.ok(html.includes("33"), "Completed events must be 33");
    assert.ok(!html.includes("NaN"), "HTML must never contain NaN");
  });

  it("4. HostStats, BusinessStats, VendorStats, ModeratorStats, and TicketStats handle empty states (zero values) gracefully", () => {
    const queryClient = new QueryClient();
    const adminFilters = normalizeAdminFilters(new URLSearchParams(), { limit: 10 });
    const ticketFilters = normalizeTicketsFilters(new URLSearchParams(), { limit: 10 });

    // Hosts empty state
    queryClient.setQueryData(adminKeys.hosts(adminFilters), {
      data: { hosts: [], statusCounts: { active: 0, pending: 0, suspended: 0 }, pagination: { total: 0 } },
    });
    const hostHtml = renderWithQueryClient(React.createElement(HostStats), queryClient);
    assert.ok(!hostHtml.includes("NaN"));

    // Businesses empty state
    queryClient.setQueryData(adminKeys.businesses(adminFilters), {
      data: { businesses: [], statusCounts: { active: 0, suspended: 0 }, pagination: { total: 0 } },
    });
    const bizHtml = renderWithQueryClient(React.createElement(BusinessStats), queryClient);
    assert.ok(!bizHtml.includes("NaN"));

    // Vendors empty state
    queryClient.setQueryData(adminKeys.vendors(adminFilters), {
      data: { vendors: [], statusCounts: { approved: 0, pending: 0, rejected: 0 }, pagination: { total: 0 } },
    });
    const vendorHtml = renderWithQueryClient(React.createElement(VendorStats), queryClient);
    assert.ok(!vendorHtml.includes("NaN"));

    // Moderators empty state
    queryClient.setQueryData(adminKeys.moderators(adminFilters), {
      data: { moderators: [], statusCounts: { active: 0, pending: 0, suspended: 0 }, pagination: { total: 0 } },
    });
    const modHtml = renderWithQueryClient(React.createElement(ModeratorStats), queryClient);
    assert.ok(!modHtml.includes("NaN"));

    // Tickets empty state
    queryClient.setQueryData(ticketsKeys.adminList(ticketFilters), {
      data: [],
      statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
      pagination: { total: 0 },
    });
    const ticketHtml = renderWithQueryClient(React.createElement(TicketStats), queryClient);
    assert.ok(!ticketHtml.includes("NaN"));
  });
});
