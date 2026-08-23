import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { setupDom } from "../helpers/domSetup.mjs";

describe("Session 1 Web Runtime: Shared Table and Admin Table Components", () => {
  let render, screen, fireEvent, act, Table;

  before(async () => {
    setupDom();
    const rtl = await import("@testing-library/react");
    render = rtl.render;
    screen = rtl.screen;
    fireEvent = rtl.fireEvent;
    act = rtl.act;

    // Dynamic import of Table after DOM setup
    const tableModule = await import("../../ui/commen/new-table/Table.js");
    Table = tableModule.default;
  });

  const sampleHeaders = ["Name", "Status", "Date"];
  const sampleData = [
    { id: "1", name: "Alpha", status: "active", date: "2026-08-20" },
    { id: "2", name: "Beta", status: "inactive", date: "2026-08-21" },
    { id: "3", name: "Gamma", status: "active", date: "2026-08-22" },
  ];

  it("renders Table in standard configuration with data without throwing", () => {
    const { container } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        showCheckboxes: true,
      })
    );

    assert.ok(container.querySelector("table"), "Table element should render");
    const rows = container.querySelectorAll("tbody tr");
    assert.equal(rows.length, 3, "Should render 3 rows");
  });

  it("renders empty state correctly without throwing", () => {
    const { container } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: [],
        emptyMessage: "No items found",
      })
    );

    assert.ok(container.textContent.includes("No items found"));
  });

  it("opens, interacts with, and closes the filter dropdown without throwing", () => {
    let selectedFilter = null;
    const filterOptions = [
      { label: "All", value: "all" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    const { container } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        showFilter: true,
        filterOptions,
        activeFilter: "all",
        onFilterChange: (val) => {
          selectedFilter = val;
        },
      })
    );

    // Find filter button
    const buttons = container.querySelectorAll("button");
    const filterBtn = Array.from(buttons).find((b) => b.getAttribute("aria-haspopup") === "listbox");
    assert.ok(filterBtn, "Filter button should exist");

    // Click filter button to open dropdown
    act(() => {
      fireEvent.click(filterBtn);
    });

    // Dropdown options should now be in the document
    const options = container.querySelectorAll('[role="option"]');
    assert.ok(options.length >= 3, "Filter dropdown options should be rendered");

    // Click an option
    act(() => {
      fireEvent.click(options[1]);
    });

    assert.equal(selectedFilter, "active", "Filter change callback should have received selected value");
  });

  it("opens, interacts with, and closes row actions dropdown without throwing", () => {
    let actionTriggered = null;
    const actions = [
      {
        type: "dropdown",
        text: "View Details",
        onClick: (row) => {
          actionTriggered = { type: "view", id: row.id };
        },
      },
      {
        type: "dropdown",
        text: "Delete",
        onClick: (row) => {
          actionTriggered = { type: "delete", id: row.id };
        },
      },
    ];

    const { container } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        actions,
      })
    );

    const actionMenuButtons = container.querySelectorAll('tbody td button[aria-haspopup="menu"]');
    assert.ok(actionMenuButtons.length > 0, "Action menu button should exist for rows");

    // Open first row action dropdown
    act(() => {
      fireEvent.click(actionMenuButtons[0]);
    });

    const menuItems = container.querySelectorAll('[role="menuitem"]');
    assert.ok(menuItems.length >= 2, "Menu items should be rendered in dropdown");

    // Click first menu item
    act(() => {
      fireEvent.click(menuItems[0]);
    });

    assert.deepEqual(actionTriggered, { type: "view", id: "1" });
  });

  it("handles bulk actions in both dropdown and inline modes without throwing", () => {
    let bulkActionTriggered = null;
    const bulkActions = [
      {
        text: "Bulk Delete",
        onClick: (selectedIds) => {
          bulkActionTriggered = selectedIds;
        },
      },
    ];

    const { container, rerender } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        showCheckboxes: true,
        bulkActions,
        inlineBulkActions: false,
      })
    );

    // Select all rows
    const selectAllCheckbox = container.querySelector("thead input[type=\"checkbox\"]");
    assert.ok(selectAllCheckbox, "Select all checkbox should exist");

    act(() => {
      fireEvent.click(selectAllCheckbox);
    });

    // In dropdown mode, bulk actions button should appear
    const bulkBtn = container.querySelector('button[aria-haspopup="menu"]');
    assert.ok(bulkBtn, "Bulk actions dropdown button should appear when rows are selected");

    act(() => {
      fireEvent.click(bulkBtn);
    });

    const bulkItem = container.querySelector('[role="menuitem"]');
    assert.ok(bulkItem, "Bulk action menu item should be rendered");

    act(() => {
      fireEvent.click(bulkItem);
    });

    assert.deepEqual(bulkActionTriggered, ["1", "2", "3"]);

    // Test inlineBulkActions mode
    rerender(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        showCheckboxes: true,
        bulkActions,
        inlineBulkActions: true,
      })
    );

    // Select first row
    const rowCheckboxes = container.querySelectorAll("tbody input[type=\"checkbox\"]");
    act(() => {
      fireEvent.click(rowCheckboxes[0]);
    });

    const inlineBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Bulk Delete")
    );
    assert.ok(inlineBtn, "Inline bulk button should be rendered");
  });

  it("closes open dropdowns on outside click and Escape key", () => {
    const filterOptions = [{ label: "All", value: "all" }];

    const { container } = render(
      React.createElement(Table, {
        headers: sampleHeaders,
        data: sampleData,
        showFilter: true,
        filterOptions,
      })
    );

    const filterBtn = container.querySelector('button[aria-haspopup="listbox"]');

    // Open dropdown
    act(() => {
      fireEvent.click(filterBtn);
    });
    assert.ok(container.querySelector('[role="listbox"]'), "Dropdown should be open");

    // Press Escape
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    assert.equal(container.querySelector('[role="listbox"]'), null, "Dropdown should close on Escape");

    // Open again
    act(() => {
      fireEvent.click(filterBtn);
    });
    assert.ok(container.querySelector('[role="listbox"]'), "Dropdown should be open again");

    // Click outside
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    assert.equal(container.querySelector('[role="listbox"]'), null, "Dropdown should close on outside click");
  });
});
