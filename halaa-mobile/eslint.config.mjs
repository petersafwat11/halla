import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Phase 9 lock-in config for halaa-mobile.
//
// Intentionally narrow: only the rules that prevent the unification work from
// regressing. Pre-existing JS quality issues (console.log audit, exhaustive-deps,
// PII leaks per §7.2 of UNIFICATION_REPORT.md) are not enforced here — they're
// the §7.3 "after Phase 8" follow-up rollout. Tightening in this slice would
// mean fixing dozens of pre-existing warnings, which is out of scope.
const lockInRules = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '../services/EventsService',
          message:
            "Phase 8: services/EventsService.js (capital E) is being retired. Use eventsService.js (lowercase) instead.",
        },
        {
          name: 'services/EventsService',
          message:
            "Phase 8: services/EventsService.js (capital E) is being retired. Use eventsService.js (lowercase) instead.",
        },
        {
          name: '../services/eventsService2',
          message:
            "Phase 8: eventsService2 façade was deleted. Import from services/eventsService.js instead.",
        },
        {
          name: 'services/eventsService2',
          message:
            "Phase 8: eventsService2 façade was deleted. Import from services/eventsService.js instead.",
        },
        {
          name: '../hooks/useDebouncedValue',
          message:
            "Phase 8: useDebouncedValue moved to @halaa/shared. Import { useDebounce } from '@halaa/shared/utils/useDebounce' instead.",
        },
        {
          name: '../utils/DirectionUtils',
          message:
            "Phase 8 slice 8: DirectionUtils was deleted (zero consumers). Do not reintroduce.",
        },
        {
          name: '../utils/locale',
          message:
            "Phase 8 slice 8: locale.js moved to @halaa/shared. Import from '@halaa/shared/utils/locale' instead.",
        },
        {
          name: '../utils/formatTemplateDate',
          message:
            "Phase 8 slice 8: formatTemplateDate moved to @halaa/shared. Import from '@halaa/shared/utils/formatTemplateDate' instead.",
        },
        {
          name: '../utils/constants/eventStatus',
          message:
            "Phase 8 slice 8: eventStatus moved to @halaa/shared. Import from '@halaa/shared/constants/eventStatus' instead.",
        },
        {
          name: '../utils/constants/plans',
          message:
            "Phase 8 slice 8: plans helpers moved to @halaa/shared. Import from '@halaa/shared/constants/plans' instead.",
        },
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "Literal[value=/\\/api\\/v[0-9]+\\//]",
      message:
        "Hardcoded /api/v2/ literal: use API_PATHS from @halaa/shared/api/paths so the prefix lives in one place. The lone exception is config/api.js (API_BASE_URL).",
    },
  ],
};

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'web-build/**',
      'metro.config.js',
      'babel.config.js',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // React Native runtime adds these on top of browser globals.
        __DEV__: 'readonly',
        global: 'readonly',
      },
    },
    // Existing `eslint-disable-next-line` directives reference rules from the
    // §7.3 follow-up rollout (no-console, global-require, exhaustive-deps).
    // Don't report them as unused — they're intentional pre-positioning for
    // when those rules get enabled.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    // The react-hooks plugin is registered so existing inline
    // `eslint-disable-next-line react-hooks/exhaustive-deps` directives
    // resolve; we don't enable any of its rules here (Phase 9 scope is
    // lock-in only, not exhaustive-deps cleanup).
    plugins: {
      'react-hooks': reactHooks,
    },
    // Phase 9 is lock-in only — turn off pre-existing JS-quality noise that
    // would surface dozens of warnings the unification work didn't cause.
    rules: {
      ...lockInRules,
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-irregular-whitespace': 'off',
      'no-misleading-character-class': 'off',
      'no-control-regex': 'off',
      'no-async-promise-executor': 'off',
      'no-cond-assign': 'off',
      'no-constant-condition': 'off',
      'no-dupe-keys': 'off',
      'no-self-assign': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-useless-catch': 'off',
      'no-fallthrough': 'off',
      'no-redeclare': 'off',
      'no-sparse-arrays': 'off',
      'no-unreachable': 'off',
      'getter-return': 'off',
      'valid-typeof': 'off',
    },
  },
  {
    // config/api.js owns API_BASE_URL — that's where /api/v2 legitimately
    // lives on mobile.
    files: ['config/api.js', 'eslint.config.mjs'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
