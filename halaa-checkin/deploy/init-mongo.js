/* global db, rs, sleep */
// Run inside checkin-mongo over localhost. First run uses MongoDB's localhost
// exception; later runs authenticate with the same persisted operator account.
const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync('/run/checkin/admin.json', 'utf8'));
const admin = db.getSiblingDB('admin');
try { admin.auth(credentials.user, credentials.password); } catch { /* first run */ }
try {
  rs.status();
} catch (error) {
  if (error.code !== 94) throw error;
  rs.initiate({ _id: 'checkin-rs', members: [{ _id: 0, host: 'checkin-mongo:27017' }] });
}
let primary = false;
for (let attempt = 0; attempt < 60; attempt++) {
  if (db.hello().isWritablePrimary) { primary = true; break; }
  sleep(1000);
}
if (!primary) throw new Error('MongoDB primary election timed out');
// createUser is the only operation allowed by localhost exception after election.
try {
  admin.createUser({ user: credentials.user, pwd: credentials.password, roles: [{ role: 'root', db: 'admin' }] });
} catch (error) {
  if (error.code !== 51003) throw error; // User already exists on repeated setup.
}
admin.auth(credentials.user, credentials.password);
const app = JSON.parse(fs.readFileSync('/tmp/checkin-app.json', 'utf8'));
const checkin = db.getSiblingDB('halaa_checkin_prod');
if (!checkin.getUser(app.user)) {
  checkin.createUser({ user: app.user, pwd: app.password, roles: [{ role: 'readWrite', db: 'halaa_checkin_prod' }] });
}
print('Check-in replica set and scoped application user are ready.');
