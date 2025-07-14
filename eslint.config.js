// eslint.config.js
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['**/*-devel/**'],
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
        'expect': 'readonly',
        'sinon': 'readonly',
        'path': 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-trailing-spaces': 'warn',
      'indent': ['warn', 2],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
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
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-trailing-spaces': 'warn',
      'indent': ['warn', 2],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
    },
  },
];

