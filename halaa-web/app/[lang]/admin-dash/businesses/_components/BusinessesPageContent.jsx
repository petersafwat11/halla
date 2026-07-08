"use client";

import { useState } from "react";
import BusinessesPageHeader from "./BusinessesPageHeader";
import BusinessStats from "./BusinessStats";
import BusinessesTable from "./BusinessesTable";

export default function BusinessesPageContent() {
  const [showAddPopup, setShowAddPopup] = useState(false);

  return (
    <>
      <BusinessesPageHeader onAddClick={() => setShowAddPopup(true)} />
      <BusinessStats />
      <BusinessesTable showAddPopup={showAddPopup} setShowAddPopup={setShowAddPopup} />
    </>
  );
}
