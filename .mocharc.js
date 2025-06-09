// .mocharc.js
// Centralized configuration for Mocha test execution.

module.exports = {
    // --- Standard Mocha Options ---
    require: './test/setup.js',
    reporter: 'spec',
    timeout: 10000, // Increased timeout to accommodate E2E tests
    exit: true,

    // --- Custom Test Suite Aliases with CORRECTED glob patterns ---
    testSuites: {
        'unit': [
            'test/collections-manager/**/*.test.js',
            'test/config-resolver/**/*.test.js',
            'test/default-handler/**/*.test.js',
            'test/main-config-loader/**/*.test.js',
            'test/pdf-generator/**/*.test.js',
            'test/plugin-config-loader/**/*.test.js',
            'test/plugin-manager/**/*.test.js',
            'test/plugin-registry-builder/**/*.test.js',
            'test/plugin_determiner/**/*.test.js',
        ],
        'core': 'test/default-handler/**/*.test.*.js',
        'collections': 'test/collections-manager/**/*.test.*.js',
        'config': [
            'test/config-resolver/**/*.test.*.js',
            'test/main-config-loader/**/*.test.*.js',
            'test/plugin-config-loader/**/*.test.*.js'
        ],
        'plugin-determiner': 'test/plugin_determiner/**/*.test.*.js',
        'plugins': [
            'plugins/*/test/**/*.test.js', // Discover tests in any plugin's 'test' directory
        ],
        'e2e': [
            // Currently, the cv-e2e test is in the 'plugins' suite for discovery by 'all',
            // but future E2E tests can be explicitly added here if they don't belong to a plugin.
        ],
        'all': [
            'test/**/*.test.*.js', // Catches all main tests in the 'test/' directory
            'plugins/*/test/**/*.test.js', // Catches all plugin-specific tests in 'plugins/*/test/'
            'test-deprecated/test-cases/**/*.test-cases.js', // Keeping deprecated tests for now
            'test-deprecated/cm-tests/**/*.test.js', // Keeping deprecated CM tests
        ]
    }
};
