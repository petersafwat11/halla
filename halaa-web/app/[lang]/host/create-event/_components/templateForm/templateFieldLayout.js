const isFullWidthField = (field) => field?.type === "textarea";

/**
 * Grid spans for the two-column template form. Textareas always span both
 * columns, and a field left alone on its row (before a textarea or at the
 * end) expands instead of leaving an empty half row.
 */
export function layoutTemplateFields(fields = []) {
  let column = 0;
  return fields.map((field, index) => {
    if (isFullWidthField(field)) {
      column = 0;
      return { field, fullWidth: true };
    }
    if (column === 1) {
      column = 0;
      return { field, fullWidth: false };
    }
    const next = fields[index + 1];
    const alone = !next || isFullWidthField(next);
    column = alone ? 0 : 1;
    return { field, fullWidth: alone };
  });
}
