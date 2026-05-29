// Phase 5 — cache-migration registry.
//
// When a domain's query-key shape changes during the hooks/<domain>/ migration,
// register an entry here so already-running browser sessions invalidate the
// old keys explicitly on first load and don't silently serve stale cache.
//
// Each entry has a stable `name`; once applied, the name is stored in
// localStorage so the migration only runs once per browser per name.
//
// For domains whose new factory produces byte-identical arrays to the old
// literal keys (locations, templates, taqnyat-templates, scheduled-extra-reminders),
// no entry is needed — the cache hits naturally.

const STORAGE_KEY = "halaa.cacheMigrations.applied";

const MIGRATIONS = [
  // Example shape for future entries:
  // {
  //   name: "2026-06-notifications-key-rename",
  //   run: (qc) => {
  //     qc.removeQueries({ queryKey: ["old-notifications"] });
  //   },
  // },
];

function readApplied() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeApplied(set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable — drop silently; migrations will retry next load.
  }
}

export function runCacheMigrations(queryClient) {
  if (typeof window === "undefined") return;
  if (MIGRATIONS.length === 0) return;
  const applied = readApplied();
  let changed = false;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    try {
      migration.run(queryClient);
      applied.add(migration.name);
      changed = true;
    } catch {
      // Best-effort: a failed migration shouldn't break app boot.
      // It'll be retried next load.
    }
  }
  if (changed) writeApplied(applied);
}
