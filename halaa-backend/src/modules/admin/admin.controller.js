/**
 * Admin Controller — facade
 * Re-exports all admin area controllers for backward compatibility.
 */
Object.assign(exports, require('./admin.hosts.controller'));
Object.assign(exports, require('./admin.businesses.controller'));
Object.assign(exports, require('./admin.vendors.controller'));
Object.assign(exports, require('./admin.moderators.controller'));
Object.assign(exports, require('./admin.events.controller'));
Object.assign(exports, require('./admin.payments.controller'));
