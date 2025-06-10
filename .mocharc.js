// dev/.mocharc.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).argv;
const group = argv.group || 'all'; 

console.log(`[Mocha] Running test group: '${group}'`);

const paths = {
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
    // Level 2
    plugin_validator: 'test/plugin-validator/**/*.js',
    // E2E Plugin Tests
    plugin_e2e: 'plugins/**/test/*.test.js',
    deprecated: 'test-deprecated/**/*.js'
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
    level2: [paths.default_handler, paths.pdf_generator, paths.collections_manager, paths.plugin_validator],
    // By Toolchain
    config: [
        paths.ConfigResolver,
        paths.main_config_loader,
        paths.plugin_config_loader,
        paths.plugin_determiner,
        paths.PluginRegistryBuilder
    ],
    // Individual Module Groups
    validator: [paths.plugin_validator],
    e2e: [paths.plugin_e2e], 
    deprecated: [paths.deprecated],
    // All Tests
    all: ['test/**/*.js']
};

const spec = groups[group] || groups.all;

module.exports = {
    require: 'test/setup.js',
    spec: spec,
    timeout: 5000,
    exit: true,
    color: true,
};
