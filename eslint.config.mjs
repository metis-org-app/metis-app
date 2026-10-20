import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '!@/features/*/index', '!@/features/*/server'],
              message:
                'Import a feature through its public entry: @/features/<name> or @/features/<name>/server.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'index.html'] },
];

export default config;
