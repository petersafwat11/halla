"use client";
import { toast } from "react-toastify";
import { downloadExportFile } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

/**
 * Hook that returns the export handler for the host events table toolbar.
 *
 * The underlying <Table /> component renders its own search/filter/export
 * toolbar; this hook just owns the export-click side effect and the
 * accompanying success/error toasts so the main table component does not
 * have to inline that logic.
 */
export const useEventsTableExport = (t) => {
  const handleExportEvents = async () => {
    try {
      const result = await downloadExportFile({
        path: API_PATHS.events.exportEventsAsExcel,
        filename: "events.xlsx",
      });

      if (result.success) {
        toast.success(t("table.exportSuccess"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("table.exportError"));
    }
  };

  return { handleExportEvents };
};
