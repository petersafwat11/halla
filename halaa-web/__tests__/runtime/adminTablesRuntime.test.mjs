import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeAdminFilters } from "../../utils/filterNormalizer.js";

describe("Session 1 Web Runtime: HostsTable, BusinessesTable, ModeratorsTable renders", () => {
  let render, HostsTable, BusinessesTable, ModeratorsTable, adminKeys;

  function createSeededWrapper(key, mockData) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    if (key && mockData) {
      queryClient.setQueryData(key, mockData);
    }

    return function Wrapper({ children }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  }

  before(async () => {
    setupDom();
    const rtl = await import("@testing-library/react");
    render = rtl.render;

    const keysMod = await import("../../hooks/admin/keys.js");
    adminKeys = keysMod.adminKeys;

    // Load tables via JSX loader
    const hostsMod = await import("../../app/[lang]/admin-dash/hosts/_components/HostsTable.jsx");
    HostsTable = hostsMod.default;

    const busMod = await import("../../app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx");
    BusinessesTable = busMod.default;

    const modMod = await import("../../app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx");
    ModeratorsTable = modMod.default;
  });

  it("renders HostsTable loading state and populated state without ReferenceError", () => {
    // 1. Loading state
    const loadingWrapper = createSeededWrapper();
    const { container: loadingContainer } = render(
      React.createElement(HostsTable, {}),
      { wrapper: loadingWrapper }
    );
    assert.ok(loadingContainer, "Loading container should mount without ReferenceError");

    // 2. Populated state
    const filters = normalizeAdminFilters({}, { limit: 10 });
    const queryKey = adminKeys.hosts(filters);
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        hosts: [
          {
            _id: "host-1",
            id: "host-1",
            name: "Test Host",
            email: "host@example.com",
            phoneNumber: "+966500000001",
            status: "active",
            subscription: { planType: "premium" },
            createdAt: "2026-08-01T10:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          pages: 1,
          total: 1,
        },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(HostsTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Hosts table should render");
    assert.ok(populatedContainer.textContent.includes("Test Host"), "Host name should be rendered in table");
  });

  it("renders BusinessesTable loading state and populated state without ReferenceError", () => {
    // 1. Loading state
    const loadingWrapper = createSeededWrapper();
    const { container: loadingContainer } = render(
      React.createElement(BusinessesTable, {}),
      { wrapper: loadingWrapper }
    );
    assert.ok(loadingContainer, "Loading container should mount without ReferenceError");

    // 2. Populated state
    const filters = normalizeAdminFilters({}, { limit: 10 });
    const queryKey = adminKeys.businesses(filters);
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        businesses: [
          {
            _id: "biz-1",
            id: "biz-1",
            name: "Test Business",
            email: "biz@example.com",
            phoneNumber: "+966500000002",
            status: "active",
            subscription: { planType: "enterprise" },
            createdAt: "2026-08-01T10:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          pages: 1,
          total: 1,
        },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(BusinessesTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Businesses table should render");
    assert.ok(populatedContainer.textContent.includes("Test Business"), "Business name should be rendered in table");
  });

  it("renders ModeratorsTable loading state and populated state without ReferenceError", () => {
    // 1. Loading state
    const loadingWrapper = createSeededWrapper();
    const { container: loadingContainer } = render(
      React.createElement(ModeratorsTable, {}),
      { wrapper: loadingWrapper }
    );
    assert.ok(loadingContainer, "Loading container should mount without ReferenceError");

    // 2. Populated state
    const filters = normalizeAdminFilters({}, { limit: 10 });
    const queryKey = adminKeys.moderators(filters);
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        moderators: [
          {
            _id: "mod-1",
            id: "mod-1",
            name: "Test Moderator",
            email: "mod@example.com",
            phoneNumber: "+966500000003",
            status: "active",
            role: "moderator",
            createdAt: "2026-08-01T10:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          pages: 1,
          total: 1,
        },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(ModeratorsTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Moderators table should render");
    assert.ok(populatedContainer.textContent.includes("Test Moderator"), "Moderator name should be rendered in table");
  });
});
