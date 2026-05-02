"use client";
import React, { useState } from "react";
import Table from "./Table";

/**
 * Example component demonstrating all features of the reusable Table component
 */
const ExampleUsage = () => {
  const [filter, setFilter] = useState("all");

  // Define table headers
  const headers = ["نوع الخدمة", "المبلغ", "تاريخ العملية", "حالة العملية"];

  // Sample data - each object must have an 'id' field
  const allData = [
    {
      id: 1,
      service: "باقة ذهبية",
      amount: "500 ريال",
      date: "2024-01-15",
      status: "success",
      statusText: "مكتمل",
    },
    {
      id: 2,
      service: "باقة فضية",
      amount: "300 ريال",
      date: "2024-01-16",
      status: "pending",
      statusText: "قيد الانتظار",
    },
    {
      id: 3,
      service: "باقة برونزية",
      amount: "200 ريال",
      date: "2024-01-17",
      status: "cancelled",
      statusText: "ملغي",
    },
    {
      id: 4,
      service: "باقة بلاتينية",
      amount: "800 ريال",
      date: "2024-01-18",
      status: "success",
      statusText: "مكتمل",
    },
  ];

  // Filter data based on selected filter
  const data = allData.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  // Define actions as dropdown menu (three dots)
  const actionsDropdown = [
    {
      type: "dropdown",
      icon: "/svg/events/edit.svg",
      text: "تعديل",
      onClick: (row) => {
        console.log("Edit row:", row);
        alert(`تعديل: ${row.service}`);
      },
    },
    {
      type: "dropdown",
      icon: "/svg/events/delete.svg",
      text: "حذف",
      onClick: (row) => {
        console.log("Delete row:", row);
        if (confirm(`هل تريد حذف ${row.service}؟`)) {
          alert("تم الحذف");
        }
      },
    },
    {
      type: "dropdown",
      icon: "/svg/events/view.svg",
      text: "عرض التفاصيل",
      onClick: (row) => {
        console.log("View row:", row);
        alert(`عرض تفاصيل: ${row.service}`);
      },
    },
  ];

  // Define actions as icon buttons
  const actionsIcons = [
    {
      icon: "/svg/events/edit.svg",
      text: "Edit",
      onClick: (row) => {
        console.log("Edit row:", row);
        alert(`تعديل: ${row.service}`);
      },
    },
    {
      icon: "/svg/events/delete.svg",
      text: "Delete",
      onClick: (row) => {
        console.log("Delete row:", row);
        if (confirm(`هل تريد حذف ${row.service}؟`)) {
          alert("تم الحذف");
        }
      },
    },
  ];

  // Define filter options
  const filterOptions = [
    {
      text: "الكل",
      onClick: () => {
        setFilter("all");
        console.log("Filter: all");
      },
    },
    {
      text: "مكتمل",
      onClick: () => {
        setFilter("success");
        console.log("Filter: success");
      },
    },
    {
      text: "قيد الانتظار",
      onClick: () => {
        setFilter("pending");
        console.log("Filter: pending");
      },
    },
    {
      text: "ملغي",
      onClick: () => {
        setFilter("cancelled");
        console.log("Filter: cancelled");
      },
    },
  ];

  // Custom cell renderer for status column
  const renderCell = (key, value, row) => {
    if (key === "status") {
      // Custom status badge rendering
      const statusConfig = {
        success: { bg: "#EAF4EF", color: "#2A8C5B" },
        cancelled: { bg: "#F9EBEA", color: "#C0392B" },
        pending: { bg: "#FBF3E6", color: "#D38200" },
      };

      const config = statusConfig[value] || statusConfig.pending;

      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
          }}
        >
          <span
            style={{
              color: config.color,
              fontFamily: "Cairo",
              fontSize: "1.2rem",
              fontWeight: 400,
              lineHeight: "1.6rem",
            }}
          >
            {row.statusText}
          </span>
        </div>
      );
    }

    if (key === "amount") {
      return <strong style={{ color: "#2A8C5B" }}>{value}</strong>;
    }

    return value;
  };

  // Handle row click
  const handleRowClick = (row) => {
    console.log("Row clicked:", row);
    alert(`تم النقر على: ${row.service}`);
  };

  // Handle export
  const handleExport = () => {
    console.log("Export data:", data);
    alert("تصدير البيانات...");
  };

  // Handle more options
  const handleMoreOptions = () => {
    console.log("More options clicked");
    alert("خيارات إضافية");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem", fontFamily: "Cairo" }}>
        أمثلة على استخدام جدول البيانات
      </h1>

      {/* Example 1: Full Featured Table with Dropdown Actions */}
      <section style={{ marginBottom: "4rem" }}>
        <h2 style={{ marginBottom: "1rem", fontFamily: "Cairo" }}>
          مثال 1: جدول كامل المميزات مع قائمة منسدلة للإجراءات
        </h2>
        <Table
          title="قائمة المدفوعات"
          headers={headers}
          data={data}
          actions={actionsDropdown}
          filterOptions={filterOptions}
          onRowClick={handleRowClick}
          onExportClick={handleExport}
          onFilterClick={handleMoreOptions}
          renderCell={renderCell}
          showSearch={true}
          showFilter={true}
          showExport={true}
        />
      </section>

      {/* Example 2: Table with Icon Actions */}
      <section style={{ marginBottom: "4rem" }}>
        <h2 style={{ marginBottom: "1rem", fontFamily: "Cairo" }}>
          مثال 2: جدول مع أيقونات الإجراءات
        </h2>
        <Table
          title="قائمة المدفوعات - أيقونات"
          headers={headers}
          data={data}
          actions={actionsIcons}
          filterOptions={filterOptions}
          renderCell={renderCell}
          showSearch={true}
          showFilter={true}
          showExport={false}
        />
      </section>

      {/* Example 3: Simple Table without Actions */}
      <section style={{ marginBottom: "4rem" }}>
        <h2 style={{ marginBottom: "1rem", fontFamily: "Cairo" }}>
          مثال 3: جدول بسيط بدون إجراءات
        </h2>
        <Table
          title="عرض البيانات فقط"
          headers={headers}
          data={data}
          renderCell={renderCell}
          showSearch={false}
          showFilter={false}
          showExport={false}
        />
      </section>

      {/* Example 4: Minimal Table */}
      <section>
        <h2 style={{ marginBottom: "1rem", fontFamily: "Cairo" }}>
          مثال 4: جدول بسيط جداً
        </h2>
        <Table headers={headers} data={data} />
      </section>
    </div>
  );
};

export default ExampleUsage;
