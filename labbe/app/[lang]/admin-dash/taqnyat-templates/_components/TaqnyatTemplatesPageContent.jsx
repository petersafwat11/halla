"use client";

import { useState } from "react";
import TaqnyatTemplatesHeader from "./TaqnyatTemplatesHeader";
import TaqnyatTemplatesStats from "./TaqnyatTemplatesStats";
import TaqnyatTemplatesTable from "./TaqnyatTemplatesTable";

export default function TaqnyatTemplatesPageContent({ lang }) {
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  const handleAssignClick = (template) => {
    setSelectedTemplate(template);
    setShowAssignPopup(true);
  };

  return (
    <>
      <TaqnyatTemplatesHeader />
      <TaqnyatTemplatesStats />
      <TaqnyatTemplatesTable
        onAssignClick={handleAssignClick}
        showAssignPopup={showAssignPopup}
        setShowAssignPopup={setShowAssignPopup}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        showCreatePopup={showCreatePopup}
        setShowCreatePopup={setShowCreatePopup}
        lang={lang}
      />
    </>
  );
}
