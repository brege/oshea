// .mocharc.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');

const argv = yargs(hideBin(process.argv)).argv;
const hasFiles = argv._ && argv._.length > 0;
const group = argv.group || (hasFiles ? 'custom' : 'all');

// lint-disable-next-line logging
console.log(`[Mocha] Running test group: '${group}'`);

const paths = {
  // --- Integration Test Paths ---
  integration:            'test/integration/**/*.js',

  // --- Subsystem & Module Integration Test Paths ---
  default_handler:        'test/integration/core/default-handler.*.js',               // Rank 0
  pdf_generator:          'test/integration/core/pdf-generator.*.js',                 // Rank 0
  math_integration:       'test/integration/core/math_integration.*.js',              // Rank 2

  ConfigResolver:         'test/integration/config/config-resolver.*.js',             // Rank 1
  main_config_loader:     'test/integration/config/main-config-loader.*.js',          // Rank 2
  plugin_config_loader:   'test/integration/config/plugin-config-loader.*.js',        // Rank 2

  plugin_determiner:      'test/integration/plugins/plugin_determiner.*.js',          // Rank 1
  PluginManager:          'test/integration/plugins/plugin-manager.*.js',             // Rank 2
  PluginRegistryBuilder:  'test/integration/plugins/plugin-registry-builder.*.js',    // Rank 2
  plugin_validator:       'test/integration/plugins/plugin-validator.*.js',           // Rank 2

  collections_manager:    'test/integration/collections/collections-manager.*.js',    // Rank 1
  cm_utils:               'test/integration/collections/cm-utils.*.js',               // Rank 2

  // --- End-to-End Test Paths ---
  e2e: [
    'test/e2e/all-e2e.test.js',
    'test/e2e/workflow-lifecycle.test.js'
  ],

  // --- Workflow / Lifecycle E2E Test Paths ---
  workflow_lifecycle:     'test/e2e/workflow-lifecycle.test.js',

  // --- Bundled Plugin In-Situ Test Paths ---
  insitu:                 'plugins/**/.contract/test/*.test.js',
};

// --- By Rank -- Integration Tests ---
const ranks = {
  // test/docs/test-generation-priority-order.md
  rank0: [ // core operations
    paths.default_handler,
    paths.pdf_generator,
  ],
  rank1: [ // essential operations
    paths.ConfigResolver,
    paths.plugin_determiner,
    paths.collections_manager,
  ],
  rank2: [ // supportive operations
    paths.PluginRegistryBuilder,
    paths.main_config_loader,
    paths.plugin_config_loader,
    paths.PluginManager,
    paths.math_integration,
  ]
};

// --- By Level ---
const levels = {
  // test/docs/checklist-level-1.md
  level1: [ // module integration tests
    paths.collections_manager,
    paths.cm_utils,
    paths.ConfigResolver,
    paths.main_config_loader,
    paths.math_integration,
    paths.plugin_config_loader,
    paths.plugin_determiner,
    paths.PluginManager,
    paths.PluginRegistryBuilder,
  ],
  // test/docs/checklist-level-2.md
  level2: [ // subsystem integration tests
    paths.default_handler,
    paths.pdf_generator,
    paths.collections_manager,
    paths.plugin_validator,
  ],
  // test/docs/checklist-level-3.md
  level3: [ // atomic E2E tests
    paths.e2e[0], // all-e2e.test.js
  ],
  // test/docs/checklist-level-4.md
  level4: [ // workflow E2E tests
    paths.e2e[1],
  ],
};

// --- By Command ---
// (Integration tests only; E2E is now handled via grep/group below)
const commands = {
  // By Modules (Integration)
  config: [
    paths.ConfigResolver,
    paths.main_config_loader,
    paths.plugin_config_loader,
  ],
  plugins: [
    paths.plugin_determiner,
    paths.PluginManager,
    paths.PluginRegistryBuilder,
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
  level3:          levels.level3,   // atomic e2e
  level4:          levels.level4,   // workflow e2e

  // Commands -- Integration Tests
  config:          commands.config,
  plugins:         commands.plugins,
  collections:     commands.collections,
  core:            commands.core,

  // E2E Groups (via grep)
  pluginCmds:      paths.e2e,       // use grep to filter
  collectionCmds:  paths.e2e,       // use grep to filter

  // All In-Situ Tests for Bundled Plugins
  insitu:          paths.insitu,

  // All Subsystem & Module Integration Tests
  integration:     paths.integration,

  // All End-to-End Tests
  e2e:             paths.e2e,

  // Everything
  all: [paths.integration, paths.e2e, paths.insitu]
};

// --- E2E Grep Patterns for Group Slicing ---
const groupGreps = {
  pluginCmds: 'plugin ',
  collectionCmds: 'collection ',
  // more as needed
};

const grep = groupGreps[group] || argv.grep;

// If files are specified on the CLI, use them; else use group logic
const spec = hasFiles ? argv._ : (groups[group] || groups.all);

const mochaConfig = {
  spec: spec,
  grep: grep,
  timeout: 20000, // Increased timeout for lifecycle tests
  exit: true,
  color: true,
  require: 'test/setup.js',
  reporter: path.join(__dirname, 'test', 'scripts', 'log-failures-reporter.js')
};

module.exports = mochaConfig;

