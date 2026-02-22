// .mocharc.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');

const argv = yargs(hideBin(process.argv)).argv;
const hasFiles = argv._ && argv._.length > 0;
const group = argv.group || (hasFiles ? 'custom' : 'all');
const debugMode = argv.debug || false;

// Set environment variable for app code to detect debug mode
if (debugMode) {
  process.env.OSHEA_DEBUG = 'true';
}

if (require.main === module) {
  console.log(`[Mocha] Running test group: '${group}'${debugMode ? ' (debug mode enabled)' : ''}`);
}
function flattenSpecs(spec) {
  if (Array.isArray(spec)) return spec.flat(Infinity);
  return [spec];
}

const paths = {
  // --- Integration Test Paths ---
  integration:            'test/runners/integration/**/*.js',

  // --- Subsystem & Module Integration Test Paths ---
  default_handler:        'test/runners/integration/core/default-handler.*.js',             // Rank 0
  pdf_generator:          'test/runners/integration/core/pdf-generator.*.js',               // Rank 0
  math_integration:       'test/runners/integration/core/math-integration.*.js',            // Rank 2

  config_resolver:        'test/runners/integration/config/config-resolver.*.js',           // Rank 1
  main_config_loader:     'test/runners/integration/config/main-config-loader.*.js',        // Rank 2
  plugin_config_loader:   'test/runners/integration/config/plugin-config-loader.*.js',      // Rank 2

  plugin_determiner:      'test/runners/integration/plugins/plugin-determiner.*.js',        // Rank 1
  plugin_manager:         'test/runners/integration/plugins/plugin-manager.*.js',           // Rank 2
  plugin_registry_builder:'test/runners/integration/plugins/plugin-registry-builder.*.js',  // Rank 2
  plugin_validator:       'test/runners/integration/plugins/plugin-validator.*.js',         // Rank 2

  collections_manager:    'test/runners/integration/collections/collections-manager.*.js',  // Rank 1
  cm_utils:               'test/runners/integration/collections/cm-utils.*.js',             // Rank 2

  // --- End-to-End Test Paths ---
  e2e_runner:             'test/runners/end-to-end/e2e-mocha.test.js',

  // --- Bundled Plugin In-Situ Test Paths ---
  insitu:                 'plugins/**/.contract/test/*.test.js',

};

// --- By Rank -- Integration Tests ---
const ranks = {
  // test/archive/docs/test-generation-priority-order.md
  rank0: [ // core operations
    paths.default_handler,
    paths.pdf_generator,
  ],
  rank1: [ // essential operations
    paths.config_resolver,
    paths.plugin_determiner,
    paths.collections_manager,
  ],
  rank2: [ // supportive operations
    paths.plugin_registry_builder,
    paths.main_config_loader,
    paths.plugin_config_loader,
    paths.plugin_manager,
    paths.math_integration,
  ]
};

// --- By Level ---
const levels = {
  // test/config/metadata-level-1.yaml
  level1: [ // module integration tests
    paths.collections_manager,
    paths.cm_utils,
    paths.config_resolver,
    paths.main_config_loader,
    paths.math_integration,
    paths.plugin_config_loader,
    paths.plugin_determiner,
    paths.plugin_manager,
    paths.plugin_registry_builder,
  ],
  // test/config/metadata-level-2.yaml
  level2: [ // subsystem integration tests
    paths.default_handler,
    paths.pdf_generator,
    paths.collections_manager,
    paths.plugin_validator,
  ],
  // test/config/metadata-level-3.yaml
  level3: [ // module E2E tests
    paths.e2e_runner
  ],
};

// --- By Command ---
// (Integration tests only; E2E is now handled via grep/group below)
const commands = {
  // By Modules (Integration)
  config: [
    paths.config_resolver,
    paths.main_config_loader,
    paths.plugin_config_loader,
  ],
  plugins: [
    paths.plugin_determiner,
    paths.plugin_manager,
    paths.plugin_registry_builder,
    paths.plugin_validator
  ],
  collections: [
    paths.collections_manager,
    paths.cm_utils
  ],
  core: [
    paths.default_handler,
    paths.pdf_generator,
    paths.math_integration
  ],
};

// --- By Group ---  [ npm run -- --group <group> ]
const groups = {

  // Ranks -- Integration Tests
  rank0:           ranks.rank0,     // core
  rank1:           ranks.rank1,     // essential
  rank2:           ranks.rank2,     // supportive

  // Levels -- Integration Tests
  level1:          levels.level1,   // module
  level2:          levels.level2,   // subsystem
  level3:          levels.level3,   // module e2e
  //level4:          levels.level4,   // workflow e2e

  // Commands -- Integration Tests
  config:          commands.config,
  plugins:         commands.plugins,
  collections:     commands.collections,
  core:            commands.core,

  // All In-Situ Tests for Bundled Plugins
  insitu:          paths.insitu,

  // All Subsystem & Module Integration Tests
  integration:     paths.integration,

  // All End-to-End Tests
  e2e:             paths.e2e_runner,

  // E2E Test Subgroups
  cli:             paths.e2e_runner,
  workflows:       paths.e2e_runner,
  validators:      paths.e2e_runner,

  // Everything
  all: [
    paths.integration,
    paths.e2e_runner,
    paths.insitu,
  ]
};

// --- E2E Grep Patterns for Group Slicing ---
const groupGreps = {
  cli: 'End-to-End Test',
  workflows: 'Workflow|Demo',
  validators: 'bundled-plugins',
};

const grep = groupGreps[group] || argv.grep;

// If files are specified on the CLI, use them; else use group logic
const spec = hasFiles ? argv._ : flattenSpecs(groups[group] || groups.all);

const mochaConfig = {
  spec: spec,
  grep: grep,
  timeout: 60000, // Increased timeout for lifecycle tests
  exit: true,
  color: true,
  require: 'test/runners/integration/setup.js',
  reporter: path.join(__dirname, 'test', 'analytics', 'log-failures-reporter.js')
};

module.exports = mochaConfig;

