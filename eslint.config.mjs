import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import { tsParser, tsPlugin } from './eslint-parser.mjs';

/**
 * The ESLint flat configuration of the project.
 *
 * WHY THE PLUGINS ARE USED DIRECTLY
 * The `eslint-config-next` package pulls in `typescript-eslint`, and the
 * version that ships with it does not support TypeScript 7 yet. The
 * project uses TypeScript 7, so the preset cannot be loaded at all.
 *
 * The rules of Next.js and of the React hooks are registered directly
 * instead. The type-aware rules stay out of the config, so the lint runs
 * again.
 *
 * WHY SOME RULES ARE WARNINGS
 * The `no-unused-vars` and the `no-explicit-any` rules of TypeScript are
 * reported as warnings: the codebase uses `any` in a lot of places, and
 * the rule would report hundreds of findings at once. The rules of the
 * React hooks of the version 7 are warnings too, because they are newer
 * than the code of the project.
 */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts'
    ]
  },
  nextPlugin.configs['core-web-vitals'],
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    }
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,

      // The TypeScript rules that report the most findings in the codebase.
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // The rules of the React hooks of the version 7 are newer than the code.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn'
    }
  }
];

export default eslintConfig;
