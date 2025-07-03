// scripts/telemetry/test-watcher.js

const chokidar = require('chokidar');
const path = require('path');
const { spawn } = require('child_process');

console.log('Initializing telemetry daemon...');

/**
 * Maps a source file's base name (e.g., 'ConfigResolver') to its
 * corresponding test file glob pattern. This is derived from your .mocharc.js.
 */
const testPaths = {
    // --- Subsystem & Module Integration Test Paths ---
    'default_handler': 'test/integration/core/default-handler.*.js',
    'pdf_generator': 'test/integration/core/pdf-generator.*.js',
    'ConfigResolver': 'test/integration/config/config-resolver.*.js',
    'plugin_determiner': 'test/integration/plugins/plugin_determiner.*.js',
    'collections_manager': 'test/integration/collections/collections-manager.*.js',
    'PluginRegistryBuilder': 'test/integration/plugins/plugin-registry-builder.*.js',
    'main_config_loader': 'test/integration/config/main-config-loader.*.js',
    'plugin_config_loader': 'test/integration/config/plugin-config-loader.*.js',
    'PluginManager': 'test/integration/plugins/plugin-manager.*.js',
    'math_integration':'test/integration/math_integration/math_integration.*.js',
    'cm_utils': 'test/integration/collections/cm-utils.*.js',
};

// Function to run mocha for a given test path
function runTest(testPath) {
    console.log(`\n[Telemetry] Running tests for: ${testPath}`);
    const mocha = spawn('npx', ['mocha', testPath], { stdio: 'inherit' });

    mocha.on('close', (code) => {
        console.log(`[Telemetry] Mocha process exited with code ${code}. Watching for next change...`);
    });
}

// Initialize watcher.
const watcher = chokidar.watch('src/**/*.js', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
});

// Add event listeners.
watcher
    .on('ready', () => console.log('[Telemetry] Initial scan complete. Ready for changes.'))
    .on('change', (filePath) => {
        console.log(`\n[Telemetry] File changed: ${filePath}`);
        const baseName = path.basename(filePath, '.js');
        const testPath = testPaths[baseName];

        if (testPath) {
            runTest(testPath);
        } else {
            console.log(`[Telemetry] No corresponding test found for ${baseName}.`);
        }
    });
