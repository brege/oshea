// eslint.config.js
const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  // Apply ESLint's recommended default rules to all files
  js.configs.recommended,

  // Configuration for CommonJS files (.js)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
        // Add globals used in your test setup
        'expect': 'readonly',
        'sinon': 'readonly',
        'path': 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { 'args': 'none' }],
      'no-trailing-spaces': 'warn',
      'indent': ['warn', 2],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
      'no-prototype-builtins': 'off',
    },
  },

  // Configuration for ES Module files (.mjs)
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // Specify this is an ES Module
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { 'args': 'none' }],
      'no-trailing-spaces': 'warn',
      'indent': ['warn', 2],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
    },
  },
];
