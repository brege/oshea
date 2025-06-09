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
            'plugins/*/test/**/*.test.js', 
        ],
        'e2e': [
        ],
        'all': [
            'test/**/*.test.*.js', 
            'plugins/*/test/**/*.test.js', 
        ],
        'deprecated': [
            'test-deprecated/run-tests.js', 
            'test-deprecated/cm-tests/run-cm-tests.js', 
        ]
    }
};
