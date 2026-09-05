"use client";

import { useState } from "react";
import CustomDesignsPageHeader from "./CustomDesignsPageHeader";
import CustomDesignsTable from "./CustomDesignsTable";
import TransitionModal from "./TransitionModal";
import styles from "../page.module.css";

export default function CustomDesignsPageContent() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const openTransition = (order) => {
    setSelectedOrder(order);
  };

  const closeTransition = () => {
    setSelectedOrder(null);
  };

  return (
    <div className={styles.container}>
      <CustomDesignsPageHeader />
      <CustomDesignsTable onSelectOrderForTransition={openTransition} />
      <TransitionModal
        isOpen={Boolean(selectedOrder)}
        onClose={closeTransition}
        order={selectedOrder}
      />
    </div>
  );
}
