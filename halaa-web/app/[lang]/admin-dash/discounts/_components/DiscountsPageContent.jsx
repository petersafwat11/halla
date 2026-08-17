"use client";

import { useState } from "react";
import DiscountsPageHeader from "./DiscountsPageHeader";
import DiscountsStats from "./DiscountsStats";
import DiscountsTable from "./DiscountsTable";
import DiscountsFormPopup from "./DiscountsFormPopup";
import styles from "../page.module.css";

export default function DiscountsPageContent() {
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  const openCreate = () => {
    setEditingDiscount(null);
    setShowModal(true);
  };

  const openEdit = (discount) => {
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  return (
    <div className={styles.container}>
      <DiscountsPageHeader onAddClick={openCreate} />
      <DiscountsStats />
      <DiscountsTable onEdit={openEdit} />
      <DiscountsFormPopup
        isOpen={showModal}
        onClose={closeModal}
        editingDiscount={editingDiscount}
      />
    </div>
  );
}
