import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { setupDom } from "../helpers/domSetup.mjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizePaymentLinksFilters } from "../../utils/filterNormalizer.js";

describe("Admin payment links runtime: tabs, filters, table, dialogs", () => {
  let render, PaymentLinksTable, PaymentsTabs, adminKeys;

  function seededWrapper(key, mockData) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    if (key && mockData) queryClient.setQueryData(key, mockData);
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
    const tableMod = await import(
      "../../app/[lang]/admin-dash/payments/_components/PaymentLinksTable.jsx"
    );
    PaymentLinksTable = tableMod.default;
    const tabsMod = await import(
      "../../app/[lang]/admin-dash/payments/_components/PaymentsTabs.jsx"
    );
    PaymentsTabs = tabsMod.default;
  });

  it("normalizes payment-link filters and strips empties", async () => {
    const params = new URLSearchParams("page=2&limit=20&search=HPL-1&status=paid&creator=&from=bad-date");
    const f = normalizePaymentLinksFilters(params, { limit: 20 });
    assert.equal(f.page, 2);
    assert.equal(f.search, "HPL-1");
    assert.equal(f.status, "paid");
    assert.ok(!("creator" in f));
    assert.ok(!("from" in f));
  });

  it("renders links table with seeded rows and status text", async () => {
    const filters = normalizePaymentLinksFilters(new URLSearchParams(""), { limit: 20 });
    const key = adminKeys.paymentLinks(filters);
    const wrapper = seededWrapper(key, {
      status: "success",
      data: {
        links: [
          {
            id: "link-1",
            reference: "HPL-ABC123",
            clientLabel: "Acme",
            description: "Balance",
            amountSar: "250.50",
            status: "awaiting_payment",
            creator: { name: "Admin" },
            createdAt: "2026-09-01T10:00:00Z",
            expiresAt: "2026-09-08T10:00:00Z",
            url: "https://invoice.moyasar.com/abc",
          },
        ],
        summary: { awaiting: 1, paid: 0, netCollectedSar: "0.00" },
        pagination: { page: 1, pages: 1, total: 1 },
      },
    });
    const { container } = render(React.createElement(PaymentLinksTable, {}), {
      wrapper,
    });
    assert.ok(container.textContent.includes("HPL-ABC123"));
    assert.ok(container.textContent.includes("250"));
  });

  it("renders tabs with transactions + payment links entries", async () => {
    const wrapper = seededWrapper();
    const { container } = render(React.createElement(PaymentsTabs, {}), { wrapper });
    assert.ok(container.textContent.includes("Transactions"));
    assert.ok(container.textContent.includes("Payment links"));
  });
});
