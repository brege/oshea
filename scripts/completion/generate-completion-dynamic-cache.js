// scripts/generate-completion-dynamic-cache.js

// This script generates a dynamic completion cache for the md-to-pdf CLI. 
// It is runtime tool for the user's machine.

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

// --- Dynamically require necessary application modules ---
// This script is allowed to be "heavy" as it runs in the background.
const projectRoot = path.resolve(__dirname, '..');
const PluginRegistryBuilder = require(path.join(projectRoot, 'src', 'PluginRegistryBuilder.js'));
const CollectionsManager = require(path.join(projectRoot, 'src', 'collections-manager', 'index.js'));
const MainConfigLoader = require(path.join(projectRoot, 'src', 'main_config_loader.js'));

/**
 * Determines the path for the dynamic completion cache file.
 * @returns {string} The absolute path to the cache file.
 */
function getCachePath() {
    const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
    const cacheDir = path.join(xdgCacheHome, 'md-to-pdf');
    return path.join(cacheDir, 'dynamic-completion-data.json');
}

/**
 * The main function to gather dynamic data and write it to the cache.
 */
async function generateCache() {
    try {
        // We cannot rely on CLI args here, so we load config to find collRoot
        const mainConfigLoader = new MainConfigLoader(projectRoot, null, false);
        const primaryConfig = await mainConfigLoader.getPrimaryMainConfig();
        const collRootFromMainConfig = primaryConfig.config.collections_root || null;

        const manager = new CollectionsManager({ collRootFromMainConfig });
        const builder = new PluginRegistryBuilder(
            projectRoot, null, null, false,
            false, null, manager, { collRoot: manager.collRoot }
        );

        // 1. Get all plugin details
        const allPlugins = await builder.getAllPluginDetails();

        // 2. Get all downloaded collection names
        const allCollections = await manager.listCollections('downloaded');

        // 3. Process the data into simple lists for completion
        const usablePlugins = allPlugins
            .filter(p => p.status && (p.status.startsWith('Registered') || p.status === 'Enabled (CM)'))
            .map(p => p.name);

        const enabledPlugins = allPlugins
            .filter(p => p.status === 'Enabled (CM)')
            .map(p => p.name);
        
        const availableFromCM = allPlugins
            .filter(p => p.status === 'Available (CM)')
            .map(p => p.name);
        
        const downloadedCollections = allCollections.map(c => c.name);

        // 4. Construct the cache object
        const cacheData = {
            usablePlugins,
            enabledPlugins,
            availablePlugins: availableFromCM,
            downloadedCollections,
            lastUpdated: new Date().toISOString(),
        };

        // 5. Write the cache file
        const cachePath = getCachePath();
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

        if (process.env.DEBUG) {
            console.log(chalk.green(`Dynamic completion cache generated successfully at: ${cachePath}`));
        }

    } catch (error) {
        // Fail silently in production, but log if debugging
        if (process.env.DEBUG) {
            console.error(chalk.red('Error generating dynamic completion cache:'), error);
        }
    }
}

// Execute the cache generation
generateCache();
