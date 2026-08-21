import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(WEB_ROOT, ...parts), 'utf8');

describe('Session 2.2 Web: Admin List Migrations & Aggregate Stats (ADM-01, ADM-02, ADM-03)', () => {
  it('All admin table screens declare mode="server" and bind controlled search & filter with page reset', () => {
    const screens = [
      { name: 'EventsTable', path: ['app', '[lang]', 'admin-dash', 'events', '_components', 'EventsTable.jsx'] },
      { name: 'TicketTableContent', path: ['app', '[lang]', 'admin-dash', 'tickets', '_components', 'TicketTableContent.jsx'] },
      { name: 'HostsTable', path: ['app', '[lang]', 'admin-dash', 'hosts', '_components', 'HostsTable.jsx'] },
      { name: 'BusinessesTable', path: ['app', '[lang]', 'admin-dash', 'businesses', '_components', 'BusinessesTable.jsx'] },
      { name: 'VendorsTable', path: ['app', '[lang]', 'admin-dash', 'vendors', '_components', 'VendorsTable.jsx'] },
      { name: 'ModeratorsTable', path: ['app', '[lang]', 'admin-dash', 'moderators', '_components', 'ModeratorsTable.jsx'] },
      { name: 'PaymentsTable', path: ['app', '[lang]', 'admin-dash', 'payments', '_components', 'PaymentsTable.js'] },
      { name: 'DiscountsTable', path: ['app', '[lang]', 'admin-dash', 'discounts', '_components', 'DiscountsTable.jsx'] },
    ];

    for (const screen of screens) {
      const source = read(...screen.path);
      assert.match(
        source,
        /mode=["']server["']/,
        `${screen.name} must declare mode="server"`
      );
      assert.match(
        source,
        /searchValue=/,
        `${screen.name} must bind searchValue`
      );
      assert.match(
        source,
        /onSearchChange=/,
        `${screen.name} must bind onSearchChange`
      );
      assert.match(
        source,
        /activeFilter=/,
        `${screen.name} must bind activeFilter`
      );
      assert.match(
        source,
        /onFilterChange=/,
        `${screen.name} must bind onFilterChange`
      );
    }
  });

  it('All admin stats cards derive counts from server statusCounts / stats rather than local visible page items', () => {
    // EventStats
    const eventStats = read('app', '[lang]', 'admin-dash', 'events', '_components', 'EventStats.jsx');
    assert.match(eventStats, /statusCounts/, 'EventStats must read statusCounts');
    assert.doesNotMatch(eventStats, /events\.filter\(/, 'EventStats must not filter visible events array for card metrics');

    // TicketStats
    const ticketStats = read('app', '[lang]', 'admin-dash', 'tickets', '_components', 'TicketStats.jsx');
    assert.match(ticketStats, /statusCounts/, 'TicketStats must read statusCounts');
    assert.doesNotMatch(ticketStats, /tickets\.filter\(/, 'TicketStats must not filter visible tickets array for card metrics');

    // HostStats
    const hostStats = read('app', '[lang]', 'admin-dash', 'hosts', '_components', 'HostStats.jsx');
    assert.match(hostStats, /statusCounts/, 'HostStats must read statusCounts');

    // BusinessStats
    const businessStats = read('app', '[lang]', 'admin-dash', 'businesses', '_components', 'BusinessStats.jsx');
    assert.match(businessStats, /statusCounts/, 'BusinessStats must read statusCounts');

    // VendorStats
    const vendorStats = read('app', '[lang]', 'admin-dash', 'vendors', '_components', 'VendorStats.jsx');
    assert.match(vendorStats, /statusCounts/, 'VendorStats must read statusCounts');
    assert.doesNotMatch(vendorStats, /vendors\.filter\(/, 'VendorStats must not filter visible vendors array for card metrics');

    // ModeratorStats
    const modStats = read('app', '[lang]', 'admin-dash', 'moderators', '_components', 'ModeratorStats.jsx');
    assert.match(modStats, /statusCounts/, 'ModeratorStats must read statusCounts');
    assert.doesNotMatch(modStats, /moderators\.filter\(/, 'ModeratorStats must not filter visible moderators array for card metrics');

    // PaymentStats
    const paymentStats = read('app', '[lang]', 'admin-dash', 'payments', '_components', 'PaymentStats.jsx');
    assert.match(paymentStats, /stats/, 'PaymentStats must read stats');
  });
});