// .mocharc.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).argv;
const group = argv.group || 'all'; 

console.log(`[Mocha] Running test group: '${group}'`);

const paths = {
    // --- Subsystem & Module Integration Test Paths ---
    
    // Rank 0
    default_handler: 'test/integration/default-handler/**/*.js',
    pdf_generator: 'test/integration/pdf-generator/**/*.js',
    
    // Rank 1
    ConfigResolver: 'test/integration/config-resolver/**/*.js',
    plugin_determiner: 'test/integration/plugin_determiner/**/*.js',
    collections_manager: 'test/integration/collections-manager/**/*.js',
    
    // Rank 2
    PluginRegistryBuilder: 'test/integration/plugin-registry-builder/**/*.js',
    main_config_loader: 'test/integration/main-config-loader/**/*.js',
    plugin_config_loader: 'test/integration/plugin-config-loader/**/*.js',
    PluginManager: 'test/integration/plugin-manager/**/*.js',
    math_integration: 'test/integration/math_integration/**/*.js',
    cm_utils: 'test/integration/collections-manager/**/*.js',

    // --- End-to-End Test Paths ---
    
    // Level 2
    plugin_validator: 'test/e2e/plugin-validator.*.js',
    
    // Level 3
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
    insitu_e2e: 'plugins/**/.contract/test/*.test.js',
};

const groups = {
    // --- By Rank ---
    rank0: [paths.default_handler, paths.pdf_generator],
    rank1: [paths.ConfigResolver, paths.plugin_determiner, paths.collections_manager],
    rank2: [
        paths.PluginRegistryBuilder,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.PluginManager,
        paths.math_integration,
    ],
    // --- By Level ---
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
    // --- Subsystem & Module Integration Tests ---
    integration: [
        paths.default_handler,
        paths.pdf_generator,
        paths.ConfigResolver, 
        paths.plugin_determiner, 
        paths.collections_manager,
        paths.PluginRegistryBuilder, 
        paths.main_config_loader, 
        paths.plugin_config_loader,
        paths.PluginManager, 
        paths.math_integration
    ],
    // --- End-to-End Tests ---
    e2e: [
        paths.plugin_validator,
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
        paths.insitu_e2e
    ],
    // --- By Toolchain ---
    config: [
        paths.ConfigResolver,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.plugin_determiner,
        paths.PluginRegistryBuilder
    ],
    //  By Specific Study ---
    validator: [paths.plugin_validator, paths.plugin_validate],
    insitu: [paths.insitu_e2e], 
    debug: [paths.plugin_add], 
    // Default
    all: ['test/integration/**/*.js', 'test/e2e/**/*.js', 'plugins/**/.contract/test/*.test.js']

};

const spec = groups[group] || groups.all;

// Start with the base config.
const mochaConfig = {
    spec: spec,
    timeout: 15000, // Increased timeout for E2E tests
    exit: true,
    color: true,
    ignore: 'test/e2e/*.manifest.js'
};

// Conditionally add the 'require' property only if the group is not an E2E group
if (group !== 't4' && group !== 'e2e' && group !== 'level3' && group !== 'validator' && group !== 'insitu') {
    mochaConfig.require = 'test/setup.js';
}

module.exports = mochaConfig;
