// Other initial requests retain their existing dictionaries. Namespaces needed
// after client navigation are loaded by the client provider on demand.
export function publicNamespacesForPath(pathname) {
  const path = pathname?.replace(/^\/(ar|en)(?=\/|$)/, '').replace(/\/$/, '') ?? null;
  if (path === '' || /^\/(market-place(?:\/.*)?|terms|privacy|refund|delete-account|support|community-rules)$/.test(path || '')) {
    return ['common', 'landing', 'plans', 'marketplace'];
  }
  return null;
}
