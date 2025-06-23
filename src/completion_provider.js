// src/completion_provider.js
const path = require('path');
const PluginRegistryBuilder = require('./PluginRegistryBuilder');
const CollectionsManager = require('./collections-manager');

// This cache will persist for the duration of a single CLI completion request.
const cache = {
    usablePlugins: null,
    downloadedCollections: null,
    // Future caches can be added here.
};

/**
 * Gets a list of all registered or enabled plugins. Uses a cache.
 * @param {object} argv The yargs argv object provided by the completion handler.
 * @returns {Promise<string[]>} A list of usable plugin names.
 */
async function getUsablePlugins(argv) {
    if (cache.usablePlugins) {
        return cache.usablePlugins;
    }

    try {
        const projectRoot = path.resolve(__dirname, '..');
        const manager = new CollectionsManager({
            collRootCliOverride: argv.collRoot,
        });
        const builder = new PluginRegistryBuilder(
            projectRoot, null, argv.config, argv.factoryDefaults,
            false, null, manager, { collRoot: manager.collRoot }
        );

        const allPlugins = await builder.getAllPluginDetails();
        const usablePluginNames = allPlugins
            .filter(p => p.status && (p.status.startsWith('Registered') || p.status === 'Enabled (CM)'))
            .map(p => p.name);
        
        cache.usablePlugins = usablePluginNames;
        return cache.usablePlugins;
    } catch (e) {
        // In case of any error during discovery, return an empty list.
        return [];
    }
}

module.exports = {
    getUsablePlugins,
};
