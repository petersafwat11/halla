export function guestQueryString(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

// Compatibility adapter for consumers requiring a complete explicit audience.
// Fail the whole query if any page fails; never publish a partial send audience.
export async function fetchCompleteGuestList(fetchPage) {
  const first = await fetchPage({ page: 1, limit: 200 });
  const rows = [...(first.data || [])];
  for (let page = 2; page <= (first.pagination?.pages || 1); page++) {
    const next = await fetchPage({ page, limit: 200 });
    rows.push(...(next.data || []));
  }
  const data = [...new Map(rows.map(row => [String(row.id || row._id), row])).values()];
  if (first.pagination && data.length !== first.pagination.total) {
    throw new Error('Guest list changed during loading. Refresh before selecting an audience.');
  }
  return { ...first, data };
}
