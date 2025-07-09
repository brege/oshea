// .mocharc.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');

const argv = yargs(hideBin(process.argv)).argv;
const hasFiles = argv._ && argv._.length > 0;
const group = argv.group || (hasFiles ? 'custom' : 'all');

console.log(`[Mocha] Running test group: '${group}'`);

const paths = {
  // --- Top-Level Test Paths ---
  integration:            'test/integration/**/*.js',
  e2e:                    'test/e2e/**/*.js',

  // --- Subsystem & Module Integration Test Paths ---
  default_handler:        'test/integration/core/default-handler.*.js',               // Rank 0
  pdf_generator:          'test/integration/core/pdf-generator.*.js',                 // Rank 0
  math_integration:       'test/integration/math_integration/math_integration.*.js',  // Rank 2

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
  plugin_add:             'test/e2e/plugin-add.*.js',
  plugin_config:          'test/e2e/config.*.js',
  plugin_create:          'test/e2e/plugin-create.*.js',
  plugin_disable:         'test/e2e/plugin-disable.*.js',
  plugin_enable:          'test/e2e/plugin-enable.*.js',
  plugin_list:            'test/e2e/plugin-list.*.js',
  plugin_validate:        'test/e2e/plugin-validate.*.js',

  plugin_convert:         'test/e2e/convert.*.js',
  plugin_generate:        'test/e2e/generate.*.js',

  collection_add:         'test/e2e/collection-add.*.js',
  collection_list:        'test/e2e/collection-list.*.js',
  collection_remove:      'test/e2e/collection-remove.*.js',
  collection_update:      'test/e2e/collection-update.*.js',

  global_flags:           'test/e2e/global-flags.*.js',

  // --- Workflow / Lifecycle E2E Test Paths ---
  workflow_lifecycle:     'test/e2e/workflow-lifecycle.*.js',
  sad_paths:              'test/e2e/sad-paths.*.js',

  // --- Bundled Plugin In-Situ Test Paths ---
  insitu:                 'plugins/**/.contract/test/*.test.js',

};

// --- By Rank -- Integration Tests ---
// test/docs/test-generation-priority-order.md
const ranks = {
  // Core Operations
  rank0: [
    paths.default_handler,
    paths.pdf_generator,
  ],
  // Essential Operations
  rank1: [
    paths.ConfigResolver,
    paths.plugin_determiner,
    paths.collections_manager,
  ],
  // Supportive Operations
  rank2: [
    paths.PluginRegistryBuilder,
    paths.main_config_loader,
    paths.plugin_config_loader,
    paths.PluginManager,
    paths.math_integration,
  ]
};

// --- By Level ---
const levels = {
  // Module Integration Tests
  // test/docs/checklist-level-1.md
  level1: [
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
  // Subsystem Integration Tests
  // test/docs/checklist-level-2.md
  level2: [
    paths.default_handler,
    paths.pdf_generator,
    paths.collections_manager,
    paths.plugin_validator,
  ],
  // End-to-End Tests
  // test/docs/checklist-level-3.md
  level3: [
    paths.plugin_convert,
    paths.plugin_generate,
    paths.plugin_config,
    paths.plugin_list,
    paths.plugin_create,
    paths.plugin_add,
    paths.plugin_enable,
    paths.plugin_disable,
    paths.plugin_validate,
    paths.collection_add,
    paths.collection_list,
    paths.collection_remove,
    paths.collection_update,
    paths.global_flags,
  ],
  // Heavy Duty E2E Tests
  // test/docs/checklist-level-4.md
  level4: [
    paths.workflow_lifecycle,
    paths.sad_paths
  ],
};

// --- By Command ---
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
  // By Groups (End-to-End)
  pluginsCmd: [
    paths.plugin_convert,
    paths.plugin_generate,
    paths.plugin_config,
    paths.plugin_list,
    paths.plugin_create,
    paths.plugin_add,
    paths.plugin_enable,
    paths.plugin_disable,
  ],
  collectionCmd: [
    paths.collection_add,
    paths.collection_list,
    paths.collection_remove,
    paths.collection_update
  ],
};

// --- By Group ---
const groups = {

  // Ranks -- Integration Tests
  rank0:           ranks.rank0,
  rank1:           ranks.rank1,
  rank2:           ranks.rank2,

  // Levels -- Integration Tests
  level1:          levels.level1,
  level2:          levels.level2,
  level3:          levels.level3,
  level4:          levels.level4,

  // Commands -- Integration Tests
  config:          commands.config,
  plugins:         commands.plugins,
  collections:     commands.collections,
  core:            commands.core,

  // Commands -- E2E Tests
  pluginCmds:      commands.pluginsCmd,
  collectionCmds:  commands.collectionCmd,

  // All In-Situ Tests for Bundled Plugins
  insitu:          paths.insitu,

  // All Subsystem & Module Integration Tests
  integration:     paths.integration,

  // All End-to-End Tests
  e2e:             paths.e2e,

  // Everything
  all: [paths.integration, paths.e2e, paths.insitu]
};


// If files are specified on the CLI, use them; else use group logic
const spec = hasFiles ? argv._ : (groups[group] || groups.all);

const mochaConfig = {
  spec: spec,
  timeout: 20000, // Increased timeout for lifecycle tests
  exit: true,
  color: true,
  require: 'test/setup.js',
  reporter: path.join(__dirname, 'test', 'scripts', 'log-failures-reporter.js')
};

module.exports = mochaConfig;
