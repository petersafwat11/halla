export function detectPlaceholders(bodyText) {
  if (!bodyText) return [];
  const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
  const seen = new Set();
  return matches.filter((m) => (seen.has(m) ? false : seen.add(m)));
}

export default detectPlaceholders;
