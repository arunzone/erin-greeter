const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const sonarjsPlugin = require('eslint-plugin-sonarjs');
const promisePlugin = require('eslint-plugin-promise');
const securityPlugin = require('eslint-plugin-security');
const jestPlugin = require('eslint-plugin-jest');

module.exports = (async () => {
  const unicorn = (await import('eslint-plugin-unicorn')).default;
  return [
  // Ignore build and vendor dirs
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**']
  },
  // Base JS recommended rules
  js.configs.recommended,
  // Global Node environment
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.builtin
      },
    },
  },
  // TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      unicorn,
      sonarjs: sonarjsPlugin,
      promise: promisePlugin,
      security: securityPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // Prefer TS-aware unused vars rule; allow underscores to ignore
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Enforce sorted grouped imports with newlines
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type'
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Promise best practices
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      // Some helpful sonarjs checks
      'sonarjs/no-duplicate-string': 'warn',
      // Unicorn rules (confirmed available in this version)
      'unicorn/better-regex': 'error',
      'unicorn/filename-case': ['error', {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
      }],
      'unicorn/no-null': 'warn',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-at': 'warn',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-for-loop': 'warn',
      // Security hints (can be noisy; set to warn)
      'security/detect-object-injection': 'warn',
      // Keep rules lightweight; Prettier handles formatting
      'prettier/prettier': 'error',
    },
  },
  // Jest test files
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'jest/expect-expect': 'warn',
    },
  },
  ];
})();
