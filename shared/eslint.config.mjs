import js from '@eslint/js';
import globals from 'globals';

// Phase 9 lock-in config for @halaa/shared.
//
// Scope: shared must stay platform-neutral pure JS. It can pull in zod (peer)
// but nothing app-specific or runtime-specific. The lint rules below catch
// the two ways shared could regress: hardcoded API prefixes (the whole point
// of paths.js) and dependencies on a host app.
export default [
  {
    ignores: ['node_modules/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // shared/ runs in both Node (Next SSR) and browser / RN contexts; both
      // expose timers + console + URL, so seed both global sets.
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/\\/api\\/v[0-9]+\\//]",
          message:
            'Hardcoded /api/v2/ literal: only src/api/paths.js may contain the prefix.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*', '~/*', 'next/*', 'react-native', 'react-native/*', 'expo', 'expo-*', '@expo/*'],
              message:
                'shared/ is platform-neutral — no Next.js, React Native, or app-internal imports allowed here.',
            },
          ],
        },
      ],
      // Tests / placeholder helpers may have unused destructure targets;
      // `catch (_)` is a common no-op pattern.
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // src/api/paths.js is the one place where the /api/v2/ prefix legitimately
    // lives — that's its entire purpose. The eslint config also embeds the
    // prefix as a regex literal in the rule itself.
    files: ['src/api/paths.js', 'eslint.config.mjs'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
