// eslint.config.js
const js = require('@eslint/js');
const globals = require('globals');

const eslintIgnores = [];

module.exports = [
  {
    ignores: eslintIgnores,
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
      'no-empty': 'off',
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
