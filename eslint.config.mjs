import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

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
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  }
];

export default eslintConfig;
