"use client";

import React from "react";
import DynamicTemplateForm from "./DynamicTemplateForm";

export default function TemplateForm(props) {
  // Skip the dynamic form entirely for custom uploads or any template
  // without a fields array — DynamicTemplateForm assumes `template.fields`
  // exists and will crash on `.find`/`.map` otherwise. Also avoid the
  // up-front useForm/zod work when the popup is closed.
  if (!props.isOpen) return null;
  if (!props.template?.fields?.length) return null;
  return <DynamicTemplateForm {...props} />;
}
