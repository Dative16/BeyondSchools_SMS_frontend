// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The layering, enforced.
 *
 * src/domain/      pure rules      -> imports nothing of ours, and no React
 * src/api/         transport       -> no rules, no components
 * src/features/    pages + hooks   -> may use both
 * src/components/  dumb primitives -> no data fetching, no rules
 *
 * A violation is an error, not a warning: a warning in a growing codebase is a
 * rule nobody follows by month three.
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router*', '@tanstack/*'],
              message:
                'The domain layer is pure. UI and data-fetching libraries do not belong in a rule.',
            },
            {
              group: ['@/api', '@/api/*', '@/components/*', '@/features/*'],
              message:
                'The domain layer imports nothing of ours. If a rule needs data, take it as an argument.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'The domain layer performs no IO.' },
        { name: 'localStorage', message: 'The domain layer performs no IO.' },
      ],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', '@/components/*', '@/features/*'],
              message:
                'The api layer is transport only. Rendering and rules live elsewhere.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api', '@/api/*', '@tanstack/react-query'],
              message:
                'Primitives do not fetch. Take the data as props so they stay reusable and testable.',
            },
            {
              group: ['@/features/*'],
              message: 'Primitives do not know about features.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api/client'],
              message:
                'Call a query hook from ../hooks, never fetch directly from a component.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['dist/', 'coverage/', 'src/api/schema.d.ts', 'playwright-report/'] },
);
