// eslint.config.js
const fs = require('fs');
const js = require('@eslint/js');
const globals = require('globals');

// Helper to read and parse .eslintignore
function readIgnoreFile(filePath) {
  try {
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

const eslintIgnore = readIgnoreFile('.eslintignore');

module.exports = [
  {
    ignores: [...eslintIgnore],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
        expect: 'readonly',
        sinon: 'readonly',
        path: 'readonly',
      },
    },
    rules: {
      camelcase: ['warn', { properties: 'never' }],
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-trailing-spaces': 'warn',
      indent: ['warn', 2],
      semi: ['warn', 'always'],
      quotes: ['warn', 'single'],
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      camelcase: ['warn', { properties: 'never' }],
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-trailing-spaces': 'warn',
      indent: ['warn', 2],
      semi: ['warn', 'always'],
      quotes: ['warn', 'single'],
    },
  },
];
