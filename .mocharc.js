// .mocharc.js
// Centralized configuration for Mocha test execution.

module.exports = {
  // --- Standard Mocha Options ---
  require: './test/setup.js',
  reporter: 'spec',
  timeout: 5000,
  exit: true,

  // --- Custom Test Suite Aliases with CORRECTED glob patterns ---
  testSuites: {
    'all': 'test/**/*.test.*.js',
    'core': 'test/default-handler/**/*.test.*.js',
    'collections': 'test/collections-manager/**/*.test.*.js',
    'config': [
      'test/config-resolver/**/*.test.*.js',
      'test/main-config-loader/**/*.test.*.js',
      'test/plugin-config-loader/**/*.test.*.js'
    ],
    'plugin-determiner': 'test/plugin_determiner/**/*.test.*.js'
  }
};
