"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseISO, isValid } from "date-fns";
import Header from "@/ui/admin/header/Header";

export default function AdminPageHeader({
  title,
  subtitle,
  actions,
  addButtonTitle,
  addButtonIcon,
  onAddButtonClick,
  wholeDays = false,
}) {
  const params = useSearchParams();
  const dateRange = useMemo(() => {
    const parse = (key) => { const date = parseISO(params.get(key) || ""); return isValid(date) ? date : undefined; };
    return { from: parse("from"), to: parse("to") };
  }, [params]);

  return (
    <Header
      selectedDateRange={dateRange}
      setSelectedDateRange={() => {}}
      wholeDays={wholeDays}
      title={title}
      subtitle={subtitle}
      actions={actions}
      addButtonTitle={addButtonTitle}
      addButtonIcon={addButtonIcon}
      onAddButtonClick={onAddButtonClick}
    />
  );
}
