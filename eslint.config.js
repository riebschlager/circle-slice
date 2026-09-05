import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'tests/reference/**',
    'js/**',
    'css/**',
    'p5/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  { ...reactHooks.configs.flat.recommended, files: ['src/**/*.{ts,tsx}'] },
]);
