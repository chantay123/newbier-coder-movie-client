import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

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
