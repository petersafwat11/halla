import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Phase 9 lock-in rules. The legacy `.eslintrc.json` carried these but Next 15
// reads the flat config exclusively, so the rules were dead config until now.
// Only the three lock-in rules from `.eslintrc.json` are migrated; `no-console`
// is intentionally left out (codebase not yet clean of allowed-in-dev logs).
const lockInRules = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '@/services/apiClient',
          message:
            "Phase 8: the legacy fetch-based apiClient is gone. Import { apiRequest } from '@/services/http' instead.",
        },
        {
          name: '@/services/legacyAdapter',
          message:
            "Phase 8: legacyAdapter retired. Import { apiRequest } from '@/services/http' instead.",
        },
        {
          name: '@/services/new-backend/apiClient',
          message:
            "Phase 8: file moved. Import { apiRequest } from '@/services/http' instead.",
        },
        {
          name: '@/services/new-backend/api.config',
          message:
            "Phase 8: API_PATHS lives in @halla/shared. Import from '@halla/shared/api/paths' instead.",
        },
        {
          name: '@/hooks/useDebounce',
          message:
            "Phase 8: useDebounce lives in @halla/shared. Import from '@halla/shared/utils/useDebounce' instead.",
        },
        {
          name: '@/hooks/events/useEventActionGate',
          message:
            "Phase 8: useEventActionGate lives in @halla/shared. Import from '@halla/shared/hooks/useEventActionGate' instead.",
        },
        {
          name: '@/utils/schemas/accountSettingsSchema',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/settings' instead.",
        },
        {
          name: '@/utils/schemas/adminPopupSchemas',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/admin' instead.",
        },
        {
          name: '@/utils/schemas/authSchema',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/auth' instead.",
        },
        {
          name: '@/utils/schemas/planSchema',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/plans' instead.",
        },
        {
          name: '@/utils/schemas/postEventSchemas',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/post-event' instead.",
        },
        {
          name: '@/utils/schemas/settingsSchemas',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/settings' instead.",
        },
        {
          name: '@/utils/schemas/ticketSchema',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/tickets' instead.",
        },
        {
          name: '@/utils/schemas/updateEventSchema',
          message:
            "Phase 8: shim deleted. Import from '@halla/shared/schemas/events' instead.",
        },
      ],
      patterns: [
        {
          group: ['**/services/new-backend/*'],
          message:
            'Phase 8: services/new-backend/ folder removed. Re-point to @/services/http or @halla/shared/api/paths.',
        },
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "Literal[value=/\\/api\\/v[0-9]+\\//]",
      message:
        'Hardcoded /api/v2/ literal: use API_PATHS from @halla/shared/api/paths so the prefix lives in one place.',
    },
  ],
};

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: lockInRules,
  },
  {
    // The lock-in rule's own selector regex contains `/api/v[0-9]+/` and would
    // match itself. The Next config also embeds `/api/v2/*` as a route rewrite
    // source. These files are the legitimate edge between code and the URL prefix.
    files: ['eslint.config.mjs', 'next.config.mjs'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];

export default eslintConfig;
