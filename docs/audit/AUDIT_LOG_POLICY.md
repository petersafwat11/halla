# Audit Log Production Policy

Defines the contract for production audit logging. Which actions get logged, fields required, who can read logs, retention, and integration with observability.

## Current State

**AuditLogModel** exists in `labbe-backend-/models/AuditLogModel.js` but **is never written to.** No audit events are currently logged to production.

## Questions for Product Owner (Phase 3)

### 1. Which Actions Get Logged?

Determine coverage:
- [ ] All database create/update/delete operations across all models?
- [ ] Only specific high-risk models (users, subscriptions, events)?
- [ ] Authentication events (login, logout, password change)?
- [ ] Authorization events (role/permission changes)?
- [ ] Admin actions (plan edits, whitelabel approvals)?
- [ ] Data exports and bulk operations?
- [ ] API key creation/revocation?

### 2. Required Fields Per Log Entry

Standard fields:
- Timestamp
- User ID / Actor
- Action (create, update, delete, login, export, etc.)
- Resource type (User, Event, Subscription, etc.)
- Resource ID
- Changes (before/after field values)
- IP address / client info
- Request ID / correlation ID

### 3. Who Can Read Audit Logs?

Define access control:
- [ ] super_admin only?
- [ ] admin + their organization's logs?
- [ ] All authenticated users see their own actions?
- [ ] Legal/compliance team read-only access?
- [ ] Data export for compliance audits?

### 4. Retention Policy

Determine lifespan:
- [ ] 90 days (operational)
- [ ] 1 year (standard compliance)
- [ ] 7 years (industry regulation requirement)
- [ ] Infinite (audit trail)

### 5. Performance Budget

Logging strategy:
- [ ] Sync (log immediately, risk blocking requests)
- [ ] Async queue (log in background, risk loss if queue fails)
- [ ] Batch (accumulate and flush periodically)
- [ ] Sampling (log only X% of events to reduce volume)

### 6. Integration Points

Future observability:
- [ ] Send to centralized logging service (ELK, Datadog, etc.)
- [ ] Expose audit logs via API for compliance tools
- [ ] Real-time alerts for suspicious actions (brute force, bulk export, etc.)
- [ ] Compliance dashboard for audit trail visualization

## Data Sources

- `labbe-backend-/models/AuditLogModel.js` — schema definition
- All service files — grep for AuditLogModel writes (expected: none)
- `labbe-backend-/src/services/` — where logging calls should be added

## Implementation Approach (Phase 3)

1. Decide coverage and required fields
2. Add audit logging middleware or service wrapper
3. Wire up all create/update/delete/auth operations to log
4. Test audit log output in staging
5. Set up retention/archival policy
6. Document audit log access control in RBAC_MATRIX.md

## Status

Stub — to be filled by product owner decision in Phase 3
