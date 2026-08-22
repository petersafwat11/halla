import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(WEB_ROOT, ...parts), 'utf8');

describe('Session 2.1 Web: Shared Table Server-Mode Contract (ADM-01, ADM-02)', () => {
  it('Table.js exports explicit mode, controlled search, filter, and accessibility contracts', () => {
    const source = read('ui', 'commen', 'new-table', 'Table.js');

    // 1. Explicit mode prop default and server-mode support
    assert.match(source, /mode\s*=\s*["']client["']/, 'Table must default mode to client');
    assert.match(source, /mode\s*===\s*["']server["']/, 'Table must have conditional server mode logic');

    // 2. Controlled search with debounce and clear
    assert.match(source, /searchValue\s*=\s*undefined/, 'Table must accept searchValue prop');
    assert.match(source, /onSearchChange\s*=\s*null/, 'Table must accept onSearchChange prop');
    assert.match(source, /debounceMs\s*=\s*300/, 'Table must have default debounceMs');
    assert.match(source, /clearSearchButton/, 'Table must provide clear search button');
    assert.match(source, /onSearchChangeRef\.current\?\.\(["']["']\)/, 'Clearing search must invoke onSearchChange with empty string');

    // 3. Controlled filter contract
    assert.match(source, /onFilterChange\s*=\s*null/, 'Table must accept onFilterChange prop');
    assert.match(source, /onFilterChange\(filterVal,\s*option\)/, 'Table must call onFilterChange with option value and option object');
    assert.match(source, /isFilterActive/, 'Table must compute whether filter is active for button styling');

    // 4. Server mode does NOT re-filter server-paginated data locally
    assert.match(
      source,
      /if\s*\(mode\s*===\s*["']server["']\)\s*\{\s*return data;\s*\}/,
      'Server mode must return data directly without client-side text filtering'
    );

    // 5. Accessibility and keyboard escape handler
    assert.match(source, /event\.key\s*===\s*["']Escape["']/, 'Escape key must close open dropdowns');
    assert.match(source, /role=["']listbox["']|role=["']menu["']/, 'Dropdowns must define appropriate ARIA roles');
    assert.match(source, /aria-expanded/, 'Filter/actions triggers must announce expanded state');

    // 6. Empty message fallback
    assert.match(source, /emptyCell/, 'Table must render emptyCell on zero rows');
    assert.match(source, /colSpan=\{totalColumnCount/, 'Empty cell must span all table columns');
  });

  it('EventsTable reference implementation uses server mode and resets page on search/filter', () => {
    const source = read('app', '[lang]', 'admin-dash', 'events', '_components', 'EventsTable.jsx');

    // Must declare mode="server"
    assert.match(source, /mode=["']server["']/, 'EventsTable must use Table in server mode');

    // Must bind controlled search and filter
    assert.match(source, /searchValue=\{filters\.search\}/, 'EventsTable must bind searchValue');
    assert.match(source, /onSearchChange=\{handleSearchChange\}/, 'EventsTable must bind onSearchChange');
    assert.match(source, /activeFilter=\{filters\.status\}/, 'EventsTable must bind activeFilter');
    assert.match(source, /onFilterChange=\{handleFilterChange\}/, 'EventsTable must bind onFilterChange');

    // Handlers must reset page to 1
    assert.match(
      source,
      /handleSearchChange[\s\S]*?params\.set\(["']page["'],\s*["']1["']\)/,
      'handleSearchChange must reset page to 1'
    );
    assert.match(
      source,
      /handleFilterChange[\s\S]*?params\.set\(["']page["'],\s*["']1["']\)/,
      'handleFilterChange must reset page to 1'
    );
  });

  it('TicketsTable and TicketTableContent reference implementation uses server mode and resets page', () => {
    const tableSource = read('app', '[lang]', 'admin-dash', 'tickets', '_components', 'TicketsTable.jsx');
    const contentSource = read('app', '[lang]', 'admin-dash', 'tickets', '_components', 'TicketTableContent.jsx');

    // TicketsTable must define handleSearchChange and handleFilterChange resetting page to 1
    assert.match(
      tableSource,
      /handleSearchChange[\s\S]*?params\.set\(["']page["'],\s*["']1["']\)/,
      'TicketsTable handleSearchChange must reset page to 1'
    );
    assert.match(
      tableSource,
      /handleFilterChange[\s\S]*?params\.set\(["']page["'],\s*["']1["']\)/,
      'TicketsTable handleFilterChange must reset page to 1'
    );

    // TicketTableContent must declare mode="server" and bind search/filter
    assert.match(contentSource, /mode=["']server["']/, 'TicketTableContent must use Table in server mode');
    assert.match(contentSource, /searchValue=\{filters\.search/, 'TicketTableContent must bind searchValue');
    assert.match(contentSource, /onSearchChange=\{handleSearchChange\}/, 'TicketTableContent must bind onSearchChange');
    assert.match(contentSource, /activeFilter=\{filters\.status/, 'TicketTableContent must bind activeFilter');
    assert.match(contentSource, /onFilterChange=\{handleFilterChange\}/, 'TicketTableContent must bind onFilterChange');
  });
});