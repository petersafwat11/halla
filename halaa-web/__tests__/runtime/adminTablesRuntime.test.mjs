import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    const queryKey = adminKeys.hosts({ page: 1, limit: 10, search: "", status: "", from: null, to: null });
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        hosts: [
          {
            _id: "h1",
            name: "Host One",
            email: "host1@example.com",
            phone: "966500000001",
            status: "active",
            createdAt: "2026-08-01",
          },
        ],
        pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(HostsTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Hosts table should render");
    assert.ok(populatedContainer.textContent.includes("Host One"), "Hosts table should display host name");
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
    const queryKey = adminKeys.businesses({ page: 1, limit: 10, search: "", status: "", from: null, to: null });
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        businesses: [
          {
            _id: "b1",
            name: "Business Corp",
            email: "biz@example.com",
            phone: "966500000002",
            status: "active",
            createdAt: "2026-08-01",
          },
        ],
        pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(BusinessesTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Businesses table should render");
    assert.ok(populatedContainer.textContent.includes("Business Corp"), "Businesses table should display business name");
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
    const queryKey = adminKeys.moderators({ page: 1, limit: 10, search: "", status: "", from: null, to: null });
    const populatedWrapper = createSeededWrapper(queryKey, {
      status: "success",
      data: {
        moderators: [
          {
            _id: "m1",
            name: "Moderator One",
            email: "mod1@example.com",
            phone: "966500000003",
            status: "active",
            role: "moderator",
            createdAt: "2026-08-01",
          },
        ],
        pagination: { totalPages: 1, total: 1, page: 1, limit: 10 },
      },
    });

    const { container: populatedContainer } = render(
      React.createElement(ModeratorsTable, {}),
      { wrapper: populatedWrapper }
    );

    assert.ok(populatedContainer.querySelector("table"), "Moderators table should render");
    assert.ok(populatedContainer.textContent.includes("Moderator One"), "Moderators table should display moderator name");
  });
});
