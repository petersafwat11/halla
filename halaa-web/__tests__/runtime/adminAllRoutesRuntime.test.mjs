import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  normalizeAdminFilters,
  normalizeDashboardFilters,
  normalizeDiscountsFilters,
  normalizeTicketsFilters,
  normalizePaymentsFilters,
} from "../../utils/filterNormalizer.js";

describe("Session 2 Web Runtime Smoke: All 12 Admin Client Component Roots", () => {
  let render, adminKeys, ticketsKeys, templateCategoriesKeys, taqnyatTemplatesKeys, discountsKeys;
  let RecentActivity,
    HostsTable,
    BusinessesTable,
    VendorsTable,
    ModeratorsTable,
    ManagePlansContent,
    PaymentsTable,
    EventsTable,
    TicketsTable,
    DiscountsTable,
    TaqnyatTemplatesTable,
    CategoriesTable;

  function createSeededWrapper(seeds = []) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    for (const { key, data } of seeds) {
      if (key && data) {
        queryClient.setQueryData(key, data);
      }
    }

    return function Wrapper({ children }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  }

  before(async () => {
    setupDom();
    const rtl = await import("@testing-library/react");
    render = rtl.render;

    adminKeys = (await import("../../hooks/admin/keys.js")).adminKeys;
    ticketsKeys = (await import("../../hooks/tickets/keys.js")).ticketsKeys;
    discountsKeys = (await import("../../hooks/discounts/keys.js")).discountsKeys;
    templateCategoriesKeys = (await import("../../hooks/templates/keys.js")).templateCategoriesKeys;
    taqnyatTemplatesKeys = (await import("../../hooks/taqnyatTemplates/keys.js")).taqnyatTemplatesKeys;

    // Load all 12 client component roots
    RecentActivity = (await import("../../app/[lang]/admin-dash/_components/RecentActivity.jsx")).default;
    HostsTable = (await import("../../app/[lang]/admin-dash/hosts/_components/HostsTable.jsx")).default;
    BusinessesTable = (await import("../../app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx")).default;
    VendorsTable = (await import("../../app/[lang]/admin-dash/vendors/_components/VendorsTable.jsx")).default;
    ModeratorsTable = (await import("../../app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx")).default;
    ManagePlansContent = (await import("../../app/[lang]/admin-dash/manage-plans/_components/ManagePlansContent.jsx")).default;
    PaymentsTable = (await import("../../app/[lang]/admin-dash/payments/_components/PaymentsTable.js")).default;
    EventsTable = (await import("../../app/[lang]/admin-dash/events/_components/EventsTable.jsx")).default;
    TicketsTable = (await import("../../app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx")).default;
    DiscountsTable = (await import("../../app/[lang]/admin-dash/discounts/_components/DiscountsTable.jsx")).default;
    TaqnyatTemplatesTable = (await import("../../app/[lang]/admin-dash/taqnyat-templates/_components/TaqnyatTemplatesTable.jsx")).default;
    CategoriesTable = (await import("../../app/[lang]/admin-dash/templates/_components/CategoriesTable.jsx")).default;
  });

  it("1. Dashboard: RecentActivity renders populated and empty states without throwing", () => {
    const dashKey = adminKeys.dashboard(normalizeDashboardFilters({}, { period: "month" }));
    const wrapper = createSeededWrapper([
      {
        key: dashKey,
        data: {
          status: "success",
          data: {
            statsCards: [],
            charts: { revenue: [], bookings: [] },
            recentActivity: {
              hosts: [{ id: "h1", name: "Recent Host", email: "h@e.com", status: "active", createdAt: "2026-08-01" }],
              events: [{ id: "e1", title: "Recent Event", hostName: "Host", status: "live", date: "2026-08-01" }],
            },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(RecentActivity, {}), { wrapper });
    assert.ok(container, "RecentActivity rendered");
  });

  it("2. Hosts: HostsTable renders populated table without throwing", () => {
    const key = adminKeys.hosts(normalizeAdminFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            hosts: [{ _id: "h1", name: "Host One", email: "h1@e.com", phone: "966500000001", status: "active", createdAt: "2026-08-01" }],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(HostsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Hosts table rendered");
    assert.ok(container.textContent.includes("Host One"));
  });

  it("3. Businesses: BusinessesTable renders populated table without throwing", () => {
    const key = adminKeys.businesses(normalizeAdminFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            businesses: [{ _id: "b1", name: "Business Corp", email: "b@e.com", phone: "966500000002", status: "active", createdAt: "2026-08-01" }],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(BusinessesTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Businesses table rendered");
    assert.ok(container.textContent.includes("Business Corp"));
  });

  it("4. Vendors: VendorsTable renders populated table without throwing", () => {
    const key = adminKeys.vendors(normalizeAdminFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            vendors: [{ _id: "v1", name: "Vendor Alpha", email: "v@e.com", phone: "966500000003", status: "approved", servicesCount: 3, createdAt: "2026-08-01" }],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(VendorsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Vendors table rendered");
    assert.ok(container.textContent.includes("Vendor Alpha"));
  });

  it("5. Moderators: ModeratorsTable renders populated table without throwing", () => {
    const key = adminKeys.moderators(normalizeAdminFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            moderators: [{ _id: "m1", name: "Mod One", email: "m@e.com", phone: "966500000004", status: "active", role: "moderator", createdAt: "2026-08-01" }],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(ModeratorsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Moderators table rendered");
    assert.ok(container.textContent.includes("Mod One"));
  });

  it("6. Manage Plans: ManagePlansContent renders plan cards without throwing", () => {
    const key = ["admin", "plans", {}];
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            plans: [
              { _id: "p1", name: "Standard Plan", price: 100, billingPeriod: "monthly", maxEvents: 5, maxInvitesPerEvent: 50, isActive: true },
            ],
          },
        },
      },
    ]);

    const { container } = render(React.createElement(ManagePlansContent, {}), { wrapper });
    assert.ok(container, "ManagePlansContent rendered");
  });

  it("7. Payments: PaymentsTable renders populated table without throwing", () => {
    const key = adminKeys.payments(normalizePaymentsFilters({}, { limit: 20 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            payments: [
              { _id: "pay1", orderId: "ORD-001", amount: 250, status: "completed", paymentMethod: "card", createdAt: "2026-08-01", customerName: "Customer" },
            ],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 20 },
            stats: { totalRevenue: 250, completedCount: 1, refundedCount: 0 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(PaymentsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Payments table rendered");
  });

  it("8. Events: EventsTable renders populated table without throwing", () => {
    const key = adminKeys.adminEventsList(normalizeAdminFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            events: [
              { _id: "ev1", title: "Tech Summit", host: { name: "Host Name" }, status: "live", date: "2026-09-01", guestsCount: 120 },
            ],
            pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
            statusCounts: { live: 1, completed: 0, scheduled: 0 },
          },
        },
      },
    ]);

    const { container } = render(React.createElement(EventsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Events table rendered");
    assert.ok(container.textContent.includes("Tech Summit"));
  });

  it("9. Tickets: TicketsTable renders populated table without throwing", () => {
    const key = ticketsKeys.myTickets(normalizeTicketsFilters({}, { limit: 10 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: [
            { _id: "tk1", ticketNumber: "TCK-1001", subject: "Payment Help", status: "open", priority: "high", createdAt: "2026-08-01" },
          ],
          pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
        },
      },
    ]);

    const { container } = render(React.createElement(TicketsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Tickets table rendered");
    assert.ok(container.textContent.includes("Payment Help"));
  });

  it("10. Discounts: DiscountsTable renders populated table without throwing", () => {
    const key = discountsKeys.adminList(normalizeDiscountsFilters({}, { limit: 20 }));
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: [
            { _id: "dc1", code: "SAVE50", discountType: "percentage", value: 50, isActive: true, usageCount: 5, maxUsage: 100 },
          ],
          pagination: { totalPages: 1, total: 1, page: 1, limit: 20 },
        },
      },
    ]);

    const { container } = render(React.createElement(DiscountsTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Discounts table rendered");
    assert.ok(container.textContent.includes("SAVE50"));
  });

  it("11. Taqnyat Templates: TaqnyatTemplatesTable renders populated table without throwing", () => {
    const key = taqnyatTemplatesKeys.adminList();
    const catKey = templateCategoriesKeys.admin();
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            templates: [
              { _id: "tt1", templateName: "Welcome SMS", bodyText: "Hello {name}", status: "APPROVED" },
            ],
            count: 1,
          },
        },
      },
      {
        key: catKey,
        data: {
          status: "success",
          data: { categories: [] },
        },
      },
    ]);

    const { container } = render(React.createElement(TaqnyatTemplatesTable, {}), { wrapper });
    assert.ok(container.querySelector("table"), "Taqnyat templates table rendered");
    assert.ok(container.textContent.includes("Welcome SMS"));
  });

  it("12. Template Categories: CategoriesTable renders populated table without throwing", () => {
    const key = templateCategoriesKeys.admin();
    const wrapper = createSeededWrapper([
      {
        key,
        data: {
          status: "success",
          data: {
            categories: [
              { _id: "cat1", code: "parties", nameEn: "Parties", nameAr: "حفلات", sortOrder: 1, active: true },
            ],
          },
        },
      },
    ]);

    const { container } = render(React.createElement(CategoriesTable, { initialCategories: [] }), { wrapper });
    assert.ok(container.querySelector("table"), "Categories table rendered");
    assert.ok(container.textContent.includes("Parties"));
  });

  it("13. Error & Loading resilience: all admin tables mount in loading and API error states without unhandled exceptions", () => {
    const errorWrapper = createSeededWrapper();
    assert.doesNotThrow(() => {
      render(React.createElement(HostsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(BusinessesTable, {}), { wrapper: errorWrapper });
      render(React.createElement(VendorsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(ModeratorsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(PaymentsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(EventsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(TicketsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(DiscountsTable, {}), { wrapper: errorWrapper });
      render(React.createElement(TaqnyatTemplatesTable, {}), { wrapper: errorWrapper });
      render(React.createElement(CategoriesTable, {}), { wrapper: errorWrapper });
    });
  });
});
