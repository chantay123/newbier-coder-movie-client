import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * The ESLint flat configuration of the project.
 *
 * The presets of Next.js are used directly: the version 16 of
 * `eslint-config-next` already exports flat config arrays, so the older
 * `FlatCompat` bridge is not needed anymore.
 *
 * WHY SOME RULES ARE WARNINGS
 * The rules that report the most findings in the codebase stay warnings,
 * so the lint is useful while the old code is cleaned up step by step.
 * The React rules of the version 7 of the hooks plugin are warnings too,
 * because they are newer than the code of the project.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts'
    ]
  },
  {
    rules: {
      // The TypeScript rules that report the most findings in the codebase.
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // The React rules of the version 7 of the hooks plugin are newer
      // than the code of the project.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // The text of the pages is written in Vietnamese, so the apostrophe
      // of the English rules does not apply.
      'react/no-unescaped-entities': 'warn'
    }
  }
];

export default eslintConfig;
