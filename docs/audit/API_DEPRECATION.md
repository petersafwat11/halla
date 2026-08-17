# API Non-Versioned Mount Deprecation Plan

Tracks removal of /api (non-versioned) legacy mount. Backend currently serves routes at both /api/v2 (preferred) and /api (legacy). Decision: drop /api entirely.

## Current State

**Backend mount:**
- `labbe-backend-/src/app.js:155` — mountRoutes('/api') (legacy, to be removed)
- `labbe-backend-/src/app.js:156` — mountRoutes('/api/v2') (preferred, keep)

Both prefixes currently serve the same routes.

## Frontend Callers Audit

### Web Callers of /api (Non-Versioned)

Found via grep: `grep -rn '"/api/' labbe/ --include="*.js" | grep -v '/api/v2' | grep -v node_modules | grep -v '.next' | grep -v '.static'`

| File | Line | Code | Fix |
|---|---|---|---|
| `D:/updated-labbe/labbe/utils/index.js` | 291 | `uploadImage(imageFile, endpoint = "/api/upload")` | Change to `/api/v2/upload` |

**Summary:** 1 web caller found.

### Mobile Callers of /api (Non-Versioned)

Found via grep: `grep -rn '"/api/' halla-mobile/ --include="*.js" | grep -v '/api/v2' | grep -v node_modules`

**Result:** None found. Mobile uses API_BASE_URL = "https://labbe-backend-production.up.railway.app/api/v2" exclusively. Mobile is ALREADY aligned to /api/v2.

### External Callers

- [ ] Check deploy scripts
- [ ] Check curl commands in documentation
- [ ] Check mobile Expo build config
- [ ] Check third-party integrations (webhooks, cronjobs)

## Removal Steps

### Phase 1: Update All Callers
1. [ ] Update `labbe/utils/index.js:291` uploadImage default to "/api/v2/upload"
2. [ ] Verify no other web callers (grep confirmed 1 only)
3. [ ] Verify mobile has no callers (grep confirmed)
4. [ ] Check external systems and documentation

### Phase 2: Remove Legacy Mount
1. [ ] Comment out or remove `mountRoutes('/api')` from `labbe-backend-/src/app.js:155`
2. [ ] Keep `mountRoutes('/api/v2')` at line 156

### Phase 3: Verify Post-Deployment
1. [ ] Monitor production logs for 404 errors on /api/*
2. [ ] Alert if /api/* traffic increases (indicates missed caller)
3. [ ] If safe after 24 hours, consider removing mount code entirely

## Testing Checklist

- [ ] Web build succeeds
- [ ] Web tests pass (especially upload-related tests)
- [ ] Mobile build succeeds
- [ ] Mobile tests pass (if any)
- [ ] Staging deployment works
- [ ] All /api/v2/* routes respond normally
- [ ] All /api/* routes return 404 (or still work if mount remains temporarily)

## Risk Assessment

**Risk Level:** Low

- Only 1 caller in web code
- Mobile already uses /api/v2
- Simple find-and-replace in one file
- Can keep mount temporarily during transition if needed

## Status

Stub — grep work completed. Removal plan to be executed in Phase 3.
