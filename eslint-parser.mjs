/**
 * A tiny loader that makes the TypeScript tooling of ESLint work with
 * the TypeScript 7 of this project.
 *
 * WHY THIS FILE EXISTS
 * The packages of `typescript-eslint` read the TypeScript API to parse a
 * file and to inspect its types. The TypeScript 7 is the new compiler
 * written in Go: it does not ship the JavaScript API anymore, so the
 * packages refuse to run and the lint of the project stops working.
 *
 * The official answer of the TypeScript team is to run the tooling with
 * the TypeScript 6 API, side by side with the TypeScript 7. This loader
 * does exactly that: it redirects every `typescript` request of the ESLint
 * process to the `typescript-6` package, which is installed next to it.
 *
 * WHY THE REDIRECTION STAYS ACTIVE
 * The packages of `typescript-eslint` load each other lazily, so the
 * redirection has to stay in place for the whole run of the lint. The
 * ESLint config file is only loaded by the ESLint process, so the
 * compiler of the project is never affected by it: `next build` and
 * `tsc` keep using the TypeScript 7.
 */

import Module from 'node:module';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Redirects the `typescript` request of the process to `typescript-6`.
 *
 * The redirection is applied once and stays active, because the packages
 * of `typescript-eslint` load each other lazily.
 */
const redirectTypescript = () => {
  const originalResolve = Module._resolveFilename;

  Module._resolveFilename = function resolveWithTypescript6(request, ...rest) {
    if (request === 'typescript') {
      try {
        return originalResolve.call(this, 'typescript-6', ...rest);
      } catch {
        // The alias is not installed, so the normal resolution is used.
      }
    }

    return originalResolve.call(this, request, ...rest);
  };
};

redirectTypescript();

/** The parser of `typescript-eslint`. */
export const tsParser = require('@typescript-eslint/parser');

/** The plugin of `typescript-eslint`. */
export const tsPlugin = require('@typescript-eslint/eslint-plugin');

export default tsParser;
