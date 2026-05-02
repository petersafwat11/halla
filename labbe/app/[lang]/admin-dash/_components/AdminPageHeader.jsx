"use client";

import { useState } from "react";
import Header from "@/ui/admin/header/Header";

export default function AdminPageHeader({
  title,
  subtitle,
  actions,
  addButtonTitle,
  addButtonIcon,
  onAddButtonClick,
}) {
  const [dateRange, setDateRange] = useState(null);

  return (
    <Header
      selectedDateRange={dateRange}
      setSelectedDateRange={setDateRange}
      title={title}
      subtitle={subtitle}
      actions={actions}
      addButtonTitle={addButtonTitle}
      addButtonIcon={addButtonIcon}
      onAddButtonClick={onAddButtonClick}
    />
  );
}
