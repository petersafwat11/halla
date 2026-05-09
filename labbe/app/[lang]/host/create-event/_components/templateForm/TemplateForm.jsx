"use client";

import React from "react";
import DynamicTemplateForm from "./DynamicTemplateForm";

export default function TemplateForm(props) {
  if (!props.template) return null;
  return <DynamicTemplateForm {...props} />;
}
