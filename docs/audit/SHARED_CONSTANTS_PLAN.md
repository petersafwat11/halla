# Shared Constants Package Plan

Plan to consolidate roles, statuses, endpoint paths, and plan definitions into a single shared npm package used by backend, web, and mobile.

## Objective

Eliminate hardcoded strings and duplicate constant definitions across three codebases. Single source of truth for:
- Role enums (user, vendor, admin, super_admin, whitelabel_admin, staff, guest)
- All status enums (USER_STATUS, EVENT_STATUS, SUBSCRIPTION_STATUS, INVITATION_STATUS, etc.)
- API endpoint paths
- Plan codes, families, and billing types
- Error codes and message constants

## Package Name

`halla-constants`

## Current State (Fragmented)

### Backend
- Constants located in: `labbe-backend-/src/shared/constants/`
- Files: `roles.js`, `plans.js`, `planDefaults.js`, status enums scattered
- Well-organized, centralized

### Web
- Constants: scattered across components and services
- Inline strings in fetch calls
- Duplicated status values in multiple files
- No single source of truth

### Mobile
- API endpoints: `halla-mobile/config/api.js` (ENDPOINTS object is good)
- Roles: inline strings in navigation guards
- Statuses: inline strings in components
- Scattered across multiple files

## What Goes in the Package

### Core Enums

```javascript
// roles.js
export const ROLES = {
  USER: 'user',
  VENDOR: 'vendor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  WHITELABEL_ADMIN: 'whitelabel_admin',
  STAFF: 'staff',
  GUEST: 'guest',
};

// statuses.js — all status enums
export const USER_STATUS = { /* ... */ };
export const EVENT_STATUS = { /* ... */ };
export const SUBSCRIPTION_STATUS = { /* ... */ };
export const INVITATION_STATUS = { /* ... */ };
export const INVITATION_RESPONSE_STATUS = { /* ... */ };
// ... etc

// plans.js
export const PLAN_CODES = { /* ... */ };
export const PLAN_TYPES = { /* ... */ };
export const PLAN_FAMILIES = { /* ... */ };
export const BILLING_TYPES = { /* ... */ };

// endpoints.js
export const ENDPOINTS = {
  AUTH: { /* ... */ },
  EVENTS: { /* ... */ },
  // ... etc
};

// errors.js
export const ERROR_CODES = { /* ... */ };
export const ERROR_MESSAGES = { /* ... */ };
```

## Package Structure

```
packages/halla-constants/
├── src/
│   ├── roles.js
│   ├── statuses.js
│   ├── endpoints.js
│   ├── plans.js
│   ├── errors.js
│   ├── index.js (barrel export)
│   └── types.d.ts (TypeScript definitions)
├── package.json
├── README.md
└── .npmignore
```

## Migration Path

### Step 1: Create Package
1. [ ] Create `packages/halla-constants/` directory
2. [ ] Set up package.json with proper exports
3. [ ] Extract backend constants from `labbe-backend-/src/shared/constants/`
4. [ ] Add TypeScript definitions (optional but recommended)

### Step 2: Set Up Workspace
1. [ ] Update root `package.json` to declare workspace (npm workspaces or pnpm)
   - Currently NOT a workspace (confirmed)
   - Will need to add `"workspaces": ["packages/*"]`
2. [ ] Update root `.gitignore` if needed
3. [ ] Run `npm install` or `pnpm install` to link packages

### Step 3: Install in All Three Codebases
1. [ ] Backend: `npm install @workspace/halla-constants` or `npm install halla-constants` (if published to npm)
2. [ ] Web: Same
3. [ ] Mobile: Same

### Step 4: Update Imports

**Backend:**
```javascript
// Before
import { PLAN_CODES } from './src/shared/constants/plans.js';

// After
import { PLAN_CODES } from '@halla/constants';
```

**Web:**
```javascript
// Before
const USER_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };

// After
import { USER_STATUS } from '@halla/constants';
```

**Mobile:**
```javascript
// Before
const ROLES = ['user', 'vendor', 'admin'];

// After
import { ROLES } from '@halla/constants';
```

### Step 5: Lint Rule
1. [ ] Add ESLint rule to prevent re-declaring constants
2. [ ] Example: `no-hardcoded-roles`, `no-duplicate-endpoints`

## Publishing Options

### Option A: Private npm Package (Recommended for now)
- Publish to private npm registry (GitHub Packages, npm, or JFrog Artifactory)
- Version: follow semver for breaking changes
- Easier versioning and dependency management

### Option B: Monorepo Workspace (If not publishing externally)
- Use npm workspaces or pnpm workspaces
- No publishing needed
- All three codebases depend on workspace package
- Simpler for development, but tighter coupling

## Implementation Checklist

- [ ] Backend: audit all hardcoded constants and move to package
- [ ] Web: audit all hardcoded status/role/endpoint strings, replace with imports
- [ ] Mobile: audit all hardcoded status/role/endpoint strings, replace with imports
- [ ] Set up workspace in root package.json
- [ ] Test backend with package import
- [ ] Test web with package import
- [ ] Test mobile with package import
- [ ] Add ESLint rules
- [ ] Update all three projects' documentation
- [ ] Deploy to staging for validation

## Risk Assessment

**Risk Level:** Medium

**Risks:**
- Circular dependency if not careful (e.g., package imports from backend)
- All three codebases become coupled to package versioning
- Breaking changes in constants affect all three projects
- Workspace setup on Windows can have path issues (mitigated by using proper workspace config)

**Mitigation:**
- Keep package minimal (constants only, no business logic)
- Use semantic versioning strictly
- Document all breaking changes
- Test thoroughly in staging before production
- Use pnpm workspaces for better monorepo support

## Success Criteria

- [ ] Single definition of ROLES enum, used everywhere
- [ ] Single definition of all statuses, used everywhere
- [ ] No duplicate constant strings in web or mobile code
- [ ] ESLint prevents new hardcoded constants
- [ ] All three projects build and test successfully
- [ ] No performance regression

## Status

Stub — decision confirmed by Peter (product owner). Implementation in fix phase.
