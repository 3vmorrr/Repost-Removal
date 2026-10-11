import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser, globals: globals.node },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' }
  }
];
