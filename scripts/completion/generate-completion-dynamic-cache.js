// scripts/completion/generate-completion-dynamic-cache.js

require('module-alias/register'); // Enable path aliases

// This script generates a dynamic completion cache for the md-to-pdf CLI.
// It is a runtime tool for the user's machine.

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Use path registry for all internal modules ---
const {
  projectRoot,
  pluginRegistryBuilderPath,
  indexPath,
  mainConfigLoaderPath,
} = require('@paths');

const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const CollectionsManager = require(indexPath);
const MainConfigLoader = require(mainConfigLoaderPath);


function getCachePath() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const cacheDir = path.join(xdgCacheHome, 'md-to-pdf');
  return path.join(cacheDir, 'dynamic-completion-data.json');
}


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
  } catch (err) {
    // Optional: log the error for debugging
    // console.error('Failed to generate dynamic completion cache:', err);
    process.exit(1);
  }
}

// Execute the cache generation
generateCache();

