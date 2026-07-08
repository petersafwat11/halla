"use client";

import { useState } from "react";
import ModeratorsPageHeader from "./ModeratorsPageHeader";
import ModeratorStats from "./ModeratorStats";
import ModeratorsTable from "./ModeratorsTable";

export default function ModeratorsPageContent() {
  const [showAddPopup, setShowAddPopup] = useState(false);

  return (
    <>
      <ModeratorsPageHeader onAddClick={() => setShowAddPopup(true)} />
      <ModeratorStats />
      <ModeratorsTable showAddPopup={showAddPopup} setShowAddPopup={setShowAddPopup} />
    </>
  );
}
