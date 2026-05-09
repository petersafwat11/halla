"use client";

import React from "react";
import DynamicTemplateForm from "./DynamicTemplateForm";
import LegacyTemplateForm from "./LegacyTemplateForm";

export default function TemplateForm(props) {
  const { template } = props;
  if (template?.fields && template.fields.length > 0) {
    return <DynamicTemplateForm {...props} />;
  }
  return <LegacyTemplateForm {...props} />;
}
