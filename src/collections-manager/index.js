// src/collections_manager/index.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous checks like existsSync
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');

const METADATA_FILENAME = '.collection-metadata.yaml';
const ENABLED_MANIFEST_FILENAME = 'enabled.yaml';

class CollectionsManager {
  constructor(options = {}) {
    this.collRoot = options.collRoot || this.determineCollRoot();
    this.debug = options.debug || false;
    if (this.debug) {
      console.log(chalk.magenta(`DEBUG (CollectionsManager): Initialized. COLL_ROOT: ${this.collRoot}`));
    }
  }

  determineCollRoot() {
    const xdgDataHome = process.env.XDG_DATA_HOME ||
      (os.platform() === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local')
        : path.join(os.homedir(), '.local', 'share'));
    return path.join(xdgDataHome, 'md-to-pdf', 'collections');
  }

  _deriveCollectionName(source) {
    const baseName = path.basename(source);
    return baseName.replace(/\.git$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  async addCollection(source, options = {}) {
    console.log(chalk.blue(`CollectionsManager: Adding collection from source: ${chalk.underline(source)}`));
    if (options.name) {
      console.log(chalk.blue(`  Requested local name: ${chalk.yellow(options.name)}`));
    }

    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      if (this.debug) {
        console.log(chalk.magenta(`  DEBUG: Ensured COLL_ROOT exists at: ${this.collRoot}`));
      }
    } catch (error) {
      console.error(chalk.red(`ERROR: Failed to create COLL_ROOT directory at ${this.collRoot}: ${error.message}`));
      throw error;
    }

    const collectionName = options.name || this._deriveCollectionName(source);
    if (!collectionName) {
        throw new Error('Could not determine a valid collection name.');
    }
    const targetPath = path.join(this.collRoot, collectionName);

    console.log(chalk.blue(`  Target collection name: ${chalk.yellow(collectionName)}`));
    console.log(chalk.blue(`  Target path: ${chalk.underline(targetPath)}`));

    if (fss.existsSync(targetPath)) {
      throw new Error(`Error: Target directory '${targetPath}' already exists. Please remove it or choose a different name.`);
    }

    const originalSource = source; 

    return new Promise(async (resolve, reject) => {
      const writeMetadata = async () => {
        const metadata = {
          source: originalSource,
          name: collectionName,
          added_on: new Date().toISOString(),
        };
        try {
          const yamlString = yaml.dump(metadata);
          await fs.writeFile(path.join(targetPath, METADATA_FILENAME), yamlString);
          if (this.debug) console.log(chalk.magenta(`  DEBUG: Wrote metadata to ${METADATA_FILENAME}`));
        } catch (metaError) {
          console.warn(chalk.yellow(`  WARN: Could not write collection metadata for ${collectionName}: ${metaError.message}`));
        }
      };

      if (/^(http(s)?:\/\/|git@)/.test(source)) {
        console.log(chalk.blue(`  Source is a URL. Attempting to clone with git...`));
        const gitProcess = spawn('git', ['clone', source, targetPath], { stdio: 'pipe' });
        
        gitProcess.stdout.on('data', (data) => {
          process.stdout.write(chalk.gray(`  GIT: ${data}`));
        });
        gitProcess.stderr.on('data', (data) => {
          process.stderr.write(chalk.yellowBright(`  GIT (stderr): ${data}`));
        });

        gitProcess.on('close', async (code) => {
          if (code === 0) {
            console.log(chalk.green(`\n  Successfully cloned '${source}' to '${targetPath}'.`));
            await writeMetadata();
            resolve(targetPath);
          } else {
            console.error(chalk.red(`\n  ERROR: Git clone failed with exit code ${code} for source '${source}'.`));
            reject(new Error(`Git clone failed with exit code ${code}.`));
          }
        });
        gitProcess.on('error', (err) => {
          console.error(chalk.red(`\n  ERROR: Failed to start git process for cloning '${source}': ${err.message}`));
          reject(err);
        });
      } else {
        const absoluteSourcePath = path.resolve(source);
        console.log(chalk.blue(`  Source is a local path: ${chalk.underline(absoluteSourcePath)}. Attempting to copy...`));
        if (!fss.existsSync(absoluteSourcePath)) {
          console.error(chalk.red(`  ERROR: Local source path does not exist: ${absoluteSourcePath}`));
          return reject(new Error(`Local source path does not exist: ${absoluteSourcePath}`));
        }
        try {
          await fsExtra.copy(absoluteSourcePath, targetPath);
          console.log(chalk.green(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`));
          await writeMetadata();
          resolve(targetPath);
        } catch (error) {
          console.error(chalk.red(`  ERROR: Failed to copy local source '${absoluteSourcePath}' to '${targetPath}': ${error.message}`));
          reject(error);
        }
      }
    });
  }

  async enablePlugin(collectionPluginId, options = {}) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enablePlugin): Enabling ID: ${collectionPluginId}, options: ${JSON.stringify(options)}`));

    const parts = collectionPluginId.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid format for collectionPluginId: "${collectionPluginId}". Expected "collection_name/plugin_id".`);
    }
    const collectionName = parts[0];
    const pluginId = parts[1];

    const availablePlugins = await this.listAvailablePlugins(collectionName);
    if (this.debug) console.log(chalk.blueBright(`[DEBUG_CM_ENABLE] Available plugins in ${collectionName}: ${JSON.stringify(availablePlugins, null, 2)}`));

    const pluginToEnable = availablePlugins.find(p => p.plugin_id === pluginId && p.collection === collectionName);

    if (!pluginToEnable) {
      throw new Error(`Plugin "${pluginId}" in collection "${collectionName}" is not available or does not exist.`);
    }
    if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) { // config_path is already absolute from _findPluginsInCollectionDir
        throw new Error(`Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`);
    }
    const absolutePluginConfigPath = pluginToEnable.config_path; 

    let invokeName = options.as || pluginId; 
    if (!/^[a-zA-Z0-9_.-]+$/.test(invokeName)) {
        throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`);
    }

    const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
    let enabledManifest = { enabled_plugins: [] };
    try {
      if (fss.existsSync(enabledManifestPath)) {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        enabledManifest = yaml.load(manifestContent);
        if (!enabledManifest || !Array.isArray(enabledManifest.enabled_plugins)) {
          if (this.debug) console.warn(chalk.yellow(`WARN (CM:enablePlugin): Invalid or empty ${ENABLED_MANIFEST_FILENAME}. Initializing with empty list.`));
          enabledManifest = { enabled_plugins: [] };
        }
      } else {
        if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enablePlugin): ${ENABLED_MANIFEST_FILENAME} not found. Initializing new one.`));
      }
    } catch (e) {
      console.warn(chalk.yellow(`WARN (CM:enablePlugin): Could not read or parse ${enabledManifestPath}: ${e.message}. Starting with a new manifest.`));
      enabledManifest = { enabled_plugins: [] };
    }

    if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
      throw new Error(`Invoke name "${invokeName}" is already in use. Choose a different name using --as.`);
    }

    const newEntry = {
      collection_name: collectionName,
      plugin_id: pluginId,
      invoke_name: invokeName,
      config_path: absolutePluginConfigPath,
      added_on: new Date().toISOString(),
    };

    enabledManifest.enabled_plugins.push(newEntry);
    enabledManifest.enabled_plugins.sort((a, b) => a.invoke_name.localeCompare(b.invoke_name)); 

    try {
      await fs.mkdir(this.collRoot, { recursive: true }); 
      const yamlString = yaml.dump(enabledManifest, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enablePlugin): Successfully wrote to ${enabledManifestPath}`));
      console.log(chalk.green(`Plugin "${collectionName}/${pluginId}" enabled successfully as "${invokeName}".`));
      return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:enablePlugin): Failed to write to ${enabledManifestPath}: ${e.message}`));
      throw e;
    }
  }

  async _findPluginsInCollectionDir(collectionPath, collectionName) {
    const availablePlugins = [];
    if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
      return [];
    }

    const pluginDirs = await fs.readdir(collectionPath, { withFileTypes: true });
    for (const pluginDir of pluginDirs) {
      if (pluginDir.isDirectory()) {
        const pluginId = pluginDir.name; // This is the directory name, e.g., "pluginBeta"
        if (pluginId === '.git' || pluginId === METADATA_FILENAME) continue;

        const pluginPath = path.join(collectionPath, pluginId);
        let actualConfigPath = '';
        let description = 'No description found.';
        let foundConfig = false;

        const standardConfigPath = path.join(pluginPath, `${pluginId}.config.yaml`);
        const alternativeYamlPath = path.join(pluginPath, `${pluginId}.yaml`);

        if (fss.existsSync(standardConfigPath) && fss.lstatSync(standardConfigPath).isFile()) {
            actualConfigPath = standardConfigPath;
            foundConfig = true;
            if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_fPICD): Found standard config ${path.basename(actualConfigPath)} for ${pluginId} in ${collectionName}`));
        } else if (fss.existsSync(alternativeYamlPath) && fss.lstatSync(alternativeYamlPath).isFile()) {
            actualConfigPath = alternativeYamlPath;
            foundConfig = true;
            if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_fPICD): Found alternative config ${path.basename(actualConfigPath)} for ${pluginId} in ${collectionName}`));
        }

        if (foundConfig && actualConfigPath) {
          try {
            const configFileContent = await fs.readFile(actualConfigPath, 'utf8');
            const pluginConfigData = yaml.load(configFileContent);
            description = pluginConfigData.description || 'Plugin description not available.';
            availablePlugins.push({
              collection: collectionName,
              plugin_id: pluginId,
              description: description,
              config_path: path.resolve(actualConfigPath), 
            });
          } catch (e) {
            console.warn(chalk.yellow(`  WARN (CM:_fPICD): Could not read/parse ${actualConfigPath} for ${pluginId} in ${collectionName}: ${e.message}`));
            availablePlugins.push({
              collection: collectionName,
              plugin_id: pluginId,
              description: chalk.red(`Error loading config: ${e.message.substring(0, 50)}...`),
              config_path: path.resolve(actualConfigPath),
            });
          }
        } else {
             if (this.debug) {
                console.log(chalk.magenta(`DEBUG (CM:_fPICD): No config file (${pluginId}.config.yaml or ${pluginId}.yaml) found for ${pluginId} in ${collectionName}. Looked in ${pluginPath}`));
             }
        }
      }
    }
    return availablePlugins; // Sorting will be done by the caller (listAvailablePlugins)
  }

  async listAvailablePlugins(collectionNameFilter = null) {
    let allAvailablePlugins = [];
    if (!fss.existsSync(this.collRoot)) {
      return [];
    }

    if (collectionNameFilter) {
      const singleCollectionPath = path.join(this.collRoot, collectionNameFilter);
      if (!fss.existsSync(singleCollectionPath) || !fss.lstatSync(singleCollectionPath).isDirectory()) {
        return []; 
      }
      allAvailablePlugins = await this._findPluginsInCollectionDir(singleCollectionPath, collectionNameFilter);
    } else {
      const collectionNames = (await fs.readdir(this.collRoot, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const collectionName of collectionNames) {
        const collectionPath = path.join(this.collRoot, collectionName);
        const pluginsInCollection = await this._findPluginsInCollectionDir(collectionPath, collectionName);
        allAvailablePlugins.push(...pluginsInCollection);
      }
    }
    allAvailablePlugins.sort((a,b) => {
        if (a.collection.toLowerCase() < b.collection.toLowerCase()) return -1;
        if (a.collection.toLowerCase() > b.collection.toLowerCase()) return 1;
        return a.plugin_id.toLowerCase().localeCompare(b.plugin_id.toLowerCase());
    });
    return allAvailablePlugins;
  }

  async listCollections(type = 'downloaded', collectionNameFilter = null) {
    console.log(chalk.blue(`CollectionsManager: Listing (type: ${chalk.yellow(type)}, filter: ${chalk.yellow(collectionNameFilter || 'all')})`));
    if (type === 'downloaded') {
      try {
        if (!fss.existsSync(this.collRoot)) {
          console.log(chalk.yellow("  Collections root directory does not exist. No collections downloaded."));
          return [];
        }
        const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
        let collections = entries
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        collections.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        if (collections.length === 0) {
          console.log(chalk.yellow("  No collections found in COLL_ROOT."));
        } else {
          console.log(chalk.blue("  Downloaded plugin collections:"));
          collections.forEach(name => console.log(chalk.greenBright(`    - ${name}`)));
        }
        return collections;
      } catch (error) {
        console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
        throw error;
      }
    } else if (type === 'available') {
        const availablePlugins = await this.listAvailablePlugins(collectionNameFilter);
        
        if (availablePlugins.length === 0) {
            if (collectionNameFilter) {
                console.log(chalk.yellow(`  No available plugins found in collection '${collectionNameFilter}'.`));
            } else {
                console.log(chalk.yellow('  No available plugins found in any downloaded collection.'));
            }
            return; 
        }

        console.log(chalk.blue("\n  Available plugins:")); 

        const groupedByCollection = availablePlugins.reduce((acc, plugin) => {
            if (!acc[plugin.collection]) {
                acc[plugin.collection] = { plugins: [], source: 'Source not specified or found' }; 
            }
            acc[plugin.collection].plugins.push(plugin);
            return acc;
        }, {});

        const sortedCollectionNames = Object.keys(groupedByCollection).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        for (const collectionName of sortedCollectionNames) {
            const metaPath = path.join(this.collRoot, collectionName, METADATA_FILENAME);
            try {
                if (fss.existsSync(metaPath)) {
                    const metaContent = await fs.readFile(metaPath, 'utf8');
                    const metaData = yaml.load(metaContent);
                    if (metaData && metaData.source) {
                        groupedByCollection[collectionName].source = metaData.source;
                    }
                }
            } catch (e) {
                if(this.debug) console.warn(chalk.yellow(`  WARN (CM:listColl): Could not read metadata for ${collectionName}: ${e.message}`));
            }
        }

        for (const collectionName of sortedCollectionNames) {
            const collectionData = groupedByCollection[collectionName];
            console.log(chalk.cyanBright(`\n  Collection: ${chalk.bold(collectionName)}`));
            if (collectionData.source && collectionData.source !== 'Source not specified or found') {
                console.log(`    ${chalk.dim('Source:')} ${chalk.white(collectionData.source)}`);
            }
            console.log(chalk.blueBright(`    Plugins:`));
            collectionData.plugins.sort((a,b) => a.plugin_id.toLowerCase().localeCompare(b.plugin_id.toLowerCase()));
            collectionData.plugins.forEach(p => {
                console.log(chalk.greenBright(`      - ${p.plugin_id}:`));
                console.log(`          ${chalk.white('Description:')} ${p.description}`);
                console.log(`          ${chalk.dim('Config Path:')} ${p.config_path}`);
            });
        }
    } else if (type === 'enabled') {
        const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
        let enabledManifest = { enabled_plugins: [] };
        if (fss.existsSync(enabledManifestPath)) {
            try {
                const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
                enabledManifest = yaml.load(manifestContent);
                if (!enabledManifest || !Array.isArray(enabledManifest.enabled_plugins)) {
                    enabledManifest = { enabled_plugins: [] };
                }
            } catch (e) {
                 console.warn(chalk.yellow(`WARN (CM:listColl): Could not read or parse ${enabledManifestPath}: ${e.message}. Assuming no plugins enabled.`));
                 enabledManifest = { enabled_plugins: [] };
            }
        }

        let pluginsToDisplay = enabledManifest.enabled_plugins;

        if (collectionNameFilter) {
            pluginsToDisplay = pluginsToDisplay.filter(p => p.collection_name === collectionNameFilter);
        }
        
        pluginsToDisplay.sort((a,b) => a.invoke_name.toLowerCase().localeCompare(b.invoke_name.toLowerCase()));

        if (pluginsToDisplay.length === 0) {
            if (collectionNameFilter) {
                console.log(chalk.yellow(`  No enabled plugins found for collection '${collectionNameFilter}'.`));
            } else {
                console.log(chalk.yellow('  No plugins are currently enabled.'));
            }
            return; // Return undefined as per original structure
        }

        console.log(chalk.blue("\n  Enabled plugins:"));
        pluginsToDisplay.forEach(p => {
            console.log(chalk.greenBright(`  - Invoke Name: ${chalk.bold(p.invoke_name)}`));
            console.log(`      ${chalk.dim('Source:')} ${p.collection_name}/${p.plugin_id}`);
            console.log(`      ${chalk.dim('Config Path:')} ${p.config_path}`);
            console.log(`      ${chalk.dim('Enabled On:')} ${p.added_on}`);
        });
        return pluginsToDisplay;

    } else {
      console.log(chalk.yellow(`  Listing for type '${type}' is not yet implemented.`));
      // return []; // Kept original behavior
    }
  }
}

module.exports = CollectionsManager;
