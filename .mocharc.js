// .mocharc.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).argv;
const group = argv.group || 'all'; 

console.log(`[Mocha] Running test group: '${group}'`);

const paths = {
    // --- Subsystem & Module Integration Test Paths ---
    
    // Rank 0
    default_handler: 'test/default-handler/**/*.js',
    pdf_generator: 'test/pdf-generator/**/*.js',
    
    // Rank 1
    ConfigResolver: 'test/config-resolver/**/*.js',
    plugin_determiner: 'test/plugin_determiner/**/*.js',
    collections_manager: 'test/collections-manager/**/*.js',
    
    // Rank 2
    PluginRegistryBuilder: 'test/plugin-registry-builder/**/*.js',
    main_config_loader: 'test/main-config-loader/**/*.js',
    plugin_config_loader: 'test/plugin-config-loader/**/*.js',
    PluginManager: 'test/plugin-manager/**/*.js',
    math_integration: 'test/math_integration/**/*.js',
    cm_utils: 'test/collections-manager/**/*.js',

    // --- End-to-End Test Paths ---
    
    // Level 2
    plugin_validator: 'test/e2e/plugin-validator.*.js',
    
    // Level 3
    plugin_convert: 'test/e2e/convert.*.js',
    plugin_generate: 'test/e2e/generate.*.js',

    // Level 3 E2E Paths
    plugin_convert: 'test/e2e/convert.*.js',
    plugin_generate: 'test/e2e/generate.*.js',
    plugin_config: 'test/e2e/config.*.js',
    plugin_list: 'test/e2e/plugin-list.*.js',
    plugin_create: 'test/e2e/plugin-create.*.js',
    plugin_add: 'test/e2e/plugin-add.*.js',
    plugin_enable: 'test/e2e/plugin-enable.*.js',
    plugin_disable: 'test/e2e/plugin-disable.*.js',
    plugin_validate: 'test/e2e/plugin-validate.*.js',
    collection_add: 'test/e2e/collection-add.*.js',
    collection_list: 'test/e2e/collection-list.*.js',
    collection_remove: 'test/e2e/collection-remove.*.js',
    collection_update: 'test/e2e/collection-update.*.js',
    global_flags: 'test/e2e/global-flags.*.js',

    // --- In-Situ E2E Tests for Bundled Plugins ---
    insitu_e2e: 'plugins/**/test/*.test.js',
};

const groups = {
    // By Rank
    rank0: [paths.default_handler, paths.pdf_generator],
    rank1: [paths.ConfigResolver, paths.plugin_determiner, paths.collections_manager],
    rank2: [
        paths.PluginRegistryBuilder,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.PluginManager,
        paths.math_integration,
    ],
    // By Level
    level1: [
        paths.ConfigResolver,
        paths.plugin_determiner,
        paths.PluginRegistryBuilder,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.PluginManager,
        paths.math_integration,
        paths.cm_utils
    ],
    level2: [
        paths.default_handler, 
        paths.pdf_generator, 
        paths.collections_manager,
        paths.plugin_validator
    ],
    level3: [
        //paths.plugin_convert,
        //paths.plugin_generate,
        //paths.plugin_config,
        //paths.plugin_list,
        //paths.plugin_create,
        //paths.plugin_add,
        //paths.plugin_enable,
        //paths.plugin_disable,
        paths.plugin_validate,
        //paths.collection_add,
        //paths.collection_list,
        //paths.collection_remove,
        //paths.collection_update,
        //paths.global_flags,
    ],
    // By Toolchain
    config: [
        paths.ConfigResolver,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.plugin_determiner,
        paths.PluginRegistryBuilder
    ],
    // Individual Module Groups
    validator: [paths.plugin_validator, paths.plgin_validate],
    insitu: [paths.insitu_e2e], 
    t4: [paths.e2e],
    // Default
    all: ['test/**/*.js', 'plugins/**/test/*.test.js']
};

const spec = groups[group] || groups.all;

// Start with the base config.
const mochaConfig = {
    spec: spec,
    timeout: 5000,
    exit: true,
    color: true,
};

// Conditionally add the 'require' property only if the group is not 't4'.
if (group !== 't4') {
    mochaConfig.require = 'test/setup.js';
}

module.exports = mochaConfig;
