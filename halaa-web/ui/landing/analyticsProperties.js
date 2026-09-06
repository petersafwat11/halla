export function landingPageProperties({ origin, lang, referrer = '', search = '' }) {
  let pageReferrer = '';
  try { pageReferrer = new URL(referrer).origin; } catch { /* Direct visit. */ }
  const params = new URLSearchParams(search);
  const campaign = {};
  for (const key of ['source', 'medium', 'campaign']) {
    const value = params.get(`utm_${key}`);
    // Accept campaign slugs only; omit free text, email addresses and URLs.
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
      campaign[key === 'campaign' ? 'campaign_name' : `campaign_${key}`] = value;
    }
  }
  return { page_location: `${origin}/${lang}`, page_referrer: pageReferrer, ...campaign };
}
