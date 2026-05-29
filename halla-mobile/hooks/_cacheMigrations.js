// Phase 5 — mobile cache-migration registry.
//
// Mirror of labbe/hooks/_cacheMigrations.js. When a domain's query-key shape
// changes during the hooks/<domain>/ migration on mobile, register an entry
// here so already-installed app versions invalidate the old keys explicitly
// on first launch and don't silently serve stale cache.
//
// Mobile risk is higher than web because users hold app versions for weeks,
// so any key-shape rename must come with a registry entry.
//
// For domains whose new factory produces byte-identical arrays to the old
// literal keys (the pilot domains: locations, templates, taqnyat-templates,
// scheduled-extra-reminders), no entry is needed — the cache hits naturally.

import AsyncStorage from "@react-native-async-storage/async-storage";

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

async function readApplied() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function writeApplied(set) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // AsyncStorage unavailable — drop silently; migrations will retry next launch.
  }
}

export async function runCacheMigrations(queryClient) {
  if (MIGRATIONS.length === 0) return;
  const applied = await readApplied();
  let changed = false;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    try {
      migration.run(queryClient);
      applied.add(migration.name);
      changed = true;
    } catch {
      // Best-effort: a failed migration shouldn't break app launch.
    }
  }
  if (changed) await writeApplied(applied);
}
