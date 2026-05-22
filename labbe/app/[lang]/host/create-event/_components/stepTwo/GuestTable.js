"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./stepTwo.module.css";
import Table from "@/ui/commen/new-table/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

const GuestTableImpl = ({
  guestList,
  allowAddOnly,
  handleEditClick,
  handleRemove,
  handleBulkDelete,
}) => {
  const { t } = useTranslation("createEvent");

  if (guestList.length === 0) {
    return null;
  }

  return (
    <div className={styles.tableContainer}>
      <Table
        title={t("guest_list_title")}
        headers={[t("name"), t("mobile")]}
        data={guestList}
        // On live events, existing rows become read-only — host can still
        // add new guests via the form above, but cannot edit or delete
        // rows that already exist.
        actions={
          allowAddOnly
            ? []
            : [
                {
                  icon: <FiEdit2 size={18} />,
                  text: t("edit"),
                  onClick: (row) => handleEditClick(row.id),
                },
                {
                  icon: <FiTrash2 size={18} />,
                  text: t("delete"),
                  onClick: (row) => handleRemove(row.id),
                },
              ]
        }
        bulkActions={
          allowAddOnly
            ? []
            : [
                {
                  icon: <FiTrash2 size={16} />,
                  text: t("delete_selected"),
                  onClick: (selectedIds) => handleBulkDelete(selectedIds),
                },
              ]
        }
        showSearch={true}
        showFilter={false}
        showExport={false}
        showCheckboxes={!allowAddOnly}
      />
    </div>
  );
};

// Memoized so keystrokes in the importer form above don't re-render the
// (potentially large) guest table. StepTwo keeps the callback props
// identity-stable; see currentItemIdRef there.
const GuestTable = React.memo(GuestTableImpl);

export default GuestTable;
