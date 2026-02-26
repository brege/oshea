// src/completion/generate-completion-dynamic-cache.js

require('module-alias/register');

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

// Use path registry for all internal modules
const {
  projectRoot,
  pluginRegistryBuilderPath,
  pluginInstallerPath,
  mainConfigLoaderPath,
} = require('@paths');

const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const PluginInstaller = require(pluginInstallerPath);
const MainConfigLoader = require(mainConfigLoaderPath);

async function getUserPluginsFromManifest(pluginsRoot) {
  const yaml = require('js-yaml');
  const pluginsManifestPath = path.join(pluginsRoot, 'plugins.yaml');

  if (!fs.existsSync(pluginsManifestPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(pluginsManifestPath, 'utf8');
    const parsed = yaml.load(content);
    const pluginStates = parsed?.plugins || {};

    // Return all user plugin names (both enabled and disabled for removal completion)
    return Object.keys(pluginStates);
  } catch (e) {
    logger.warn(
      'Could not read user plugins manifest for completion cache:',
      e.message,
    );
    return [];
  }
}

function getCachePath() {
  const xdgCacheHome =
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const cacheDir = path.join(xdgCacheHome, 'oshea');
  return path.join(cacheDir, 'dynamic-completion-data.json');
}

async function generateCache() {
  try {
    logger.debug('Starting dynamic completion cache generation...');
    // We cannot rely on CLI args here, so we load config to find pluginsRoot
    const mainConfigLoader = new MainConfigLoader(projectRoot, null, false);
    const primaryConfig = await mainConfigLoader.getPrimaryMainConfig();
    const pluginsRootFromMainConfig = primaryConfig.config.plugins_root || null;
    logger.debug(`plugins_root resolved: ${pluginsRootFromMainConfig}`);

    const manager = new PluginInstaller({ pluginsRootFromMainConfig });
    const builder = new PluginRegistryBuilder(
      projectRoot,
      null,
      null,
      false,
      false,
      null,
      manager,
      { pluginsRoot: manager.pluginsRoot },
    );

    // 1. Get all plugin details
    const allPlugins = await builder.getAllPluginDetails();
    logger.debug(`Discovered ${allPlugins.length} plugins.`);

    // 2. Get user plugins from manifest
    const userPlugins = await getUserPluginsFromManifest(manager.pluginsRoot);
    logger.debug(`Discovered ${userPlugins.length} user plugins.`);

    // 3. Process the data into simple lists for completion
    const usablePlugins = allPlugins
      .filter(
        (p) =>
          p.status &&
          (p.status.startsWith('Registered') ||
            p.status.startsWith('Enabled (')),
      )
      .map((p) => p.name);

    const enabledPlugins = allPlugins
      .filter((p) => p.status?.startsWith('Enabled ('))
      .map((p) => p.name);

    const availableInstalled = allPlugins
      .filter((p) => p.status === 'Available (Installed)')
      .map((p) => p.name);

    const cacheStats = [
      `usablePlugins(${usablePlugins.length})`,
      `enabledPlugins(${enabledPlugins.length})`,
      `availablePlugins(${availableInstalled.length})`,
      `userPlugins(${userPlugins.length})`,
    ].join(', ');
    logger.debug(`Cache data will include: ${cacheStats}`);

    // 5. Construct the cache object
    const cacheData = {
      usablePlugins,
      enabledPlugins,
      availablePlugins: availableInstalled,
      downloadedCollections: [],
      userPlugins,
      lastUpdated: new Date().toISOString(),
    };

    // 6. Write the cache file
    const cachePath = getCachePath();
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    logger.debug(`Dynamic completion cache written to: ${cachePath}`);
  } catch (err) {
    logger.error(
      `Failed to generate dynamic completion cache: ${err?.message || String(err)}`,
    );
    if (err?.stack) {
      logger.error(err.stack);
    }
    process.exit(1);
  }
}

// Execute the cache generation
generateCache();
