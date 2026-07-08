"use client";

import { useState } from "react";
import HostsPageHeader from "./HostsPageHeader";
import HostStats from "./HostStats";
import HostsTable from "./HostsTable";

export default function HostsPageContent() {
  const [showAddPopup, setShowAddPopup] = useState(false);

  return (
    <>
      <HostsPageHeader onAddClick={() => setShowAddPopup(true)} />
      <HostStats />
      <HostsTable showAddPopup={showAddPopup} setShowAddPopup={setShowAddPopup} />
    </>
  );
}
