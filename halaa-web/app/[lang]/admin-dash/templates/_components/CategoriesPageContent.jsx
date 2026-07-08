"use client";

import { useState } from "react";
import CategoriesPageHeader from "./CategoriesPageHeader";
import CategoriesStats from "./CategoriesStats";
import CategoriesTable from "./CategoriesTable";

export default function CategoriesPageContent() {
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  return (
    <>
      <CategoriesPageHeader onAddClick={() => setShowCreatePopup(true)} />
      <CategoriesStats />
      <CategoriesTable showCreatePopup={showCreatePopup} setShowCreatePopup={setShowCreatePopup} />
    </>
  );
}
