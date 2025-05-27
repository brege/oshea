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

    const originalSource = source; // Keep the original source for metadata

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


  async _findPluginsInCollectionDir(collectionPath, collectionName) {
    const availablePlugins = [];
    if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
      if (this.debug) console.log(chalk.magenta(`DEBUG: Collection path ${collectionPath} does not exist or is not a directory.`));
      return [];
    }

    const pluginDirs = await fs.readdir(collectionPath, { withFileTypes: true });
    for (const pluginDir of pluginDirs) {
      if (pluginDir.isDirectory()) {
        const pluginId = pluginDir.name;
        // Skip common Git directory or our metadata file's directory if it was named like one
        if (pluginId === '.git' || pluginId === METADATA_FILENAME) continue;

        const pluginPath = path.join(collectionPath, pluginId);
        let configPath = path.join(pluginPath, `${pluginId}.config.yaml`);
        let description = 'No description found.';
        let foundConfig = false;

        if (fss.existsSync(configPath) && fss.lstatSync(configPath).isFile()) {
            foundConfig = true;
        } else {
            try {
                const filesInPluginDir = await fs.readdir(pluginPath);
                const alternativeConfig = filesInPluginDir.find(f => f.endsWith('.config.yaml'));
                if (alternativeConfig) {
                    configPath = path.join(pluginPath, alternativeConfig);
                    foundConfig = true;
                    if (this.debug) console.log(chalk.magenta(`DEBUG: Found alternative config ${alternativeConfig} for plugin ${pluginId} in ${collectionName}`));
                }
            } catch (e) {
                 if (this.debug) console.warn(chalk.yellow(`WARN: Could not read directory ${pluginPath} to find alternative config: ${e.message}`));
            }
        }

        if (foundConfig) {
          try {
            const configFileContent = await fs.readFile(configPath, 'utf8');
            const pluginConfig = yaml.load(configFileContent);
            description = pluginConfig.description || 'Plugin description not available.';
            availablePlugins.push({
              collection: collectionName,
              plugin_id: pluginId,
              description: description,
              config_path: configPath,
            });
          } catch (e) {
            console.warn(chalk.yellow(`  WARN: Could not read or parse config file ${configPath} for plugin ${pluginId} in ${collectionName}: ${e.message}`));
            availablePlugins.push({
              collection: collectionName,
              plugin_id: pluginId,
              description: chalk.red(`Error loading config: ${e.message.substring(0, 50)}...`),
              config_path: configPath,
            });
          }
        } else {
             if (this.debug) console.log(chalk.magenta(`DEBUG: No config file found for potential plugin ${pluginId} in ${collectionName} (path: ${pluginPath})`));
        }
      }
    }
    return availablePlugins;
  }

  async listAvailablePlugins(collectionNameFilter = null) {
    let allAvailablePlugins = [];
    if (!fss.existsSync(this.collRoot)) {
      return [];
    }

    if (collectionNameFilter) {
      const singleCollectionPath = path.join(this.collRoot, collectionNameFilter);
      if (!fss.existsSync(singleCollectionPath) || !fss.lstatSync(singleCollectionPath).isDirectory()) {
        return []; // Will be handled by listCollections caller
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
    return allAvailablePlugins;
  }

  async listCollections(type = 'downloaded', collectionNameFilter = null) {
    console.log(chalk.blue(`CollectionsManager: Listing collections (type: ${chalk.yellow(type)}, filter: ${chalk.yellow(collectionNameFilter || 'all')})`));
    if (type === 'downloaded') {
      try {
        if (!fss.existsSync(this.collRoot)) {
          console.log(chalk.yellow("  Collections root directory does not exist. No collections downloaded."));
          return [];
        }
        const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
        const collections = entries
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

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

        for (const collectionName in groupedByCollection) {
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
                if(this.debug) console.warn(chalk.yellow(`  WARN: Could not read metadata for ${collectionName}: ${e.message}`));
            }
        }

        for (const collectionName in groupedByCollection) {
            const collectionData = groupedByCollection[collectionName];
            console.log(chalk.cyanBright(`\n  Collection: ${chalk.bold(collectionName)}`));
            if (collectionData.source && collectionData.source !== 'Source not specified or found') {
                console.log(`    ${chalk.dim('Source:')} ${chalk.white(collectionData.source)}`);
            }
            console.log(chalk.blueBright(`    Plugins:`));
            collectionData.plugins.forEach(p => {
                console.log(chalk.greenBright(`      - ${p.plugin_id}:`));
                console.log(`          ${chalk.white('Description:')} ${p.description}`);
                console.log(`          ${chalk.dim('Config Path:')} ${p.config_path}`); // Path will use default terminal color
            });
        }
    } else {
      console.log(chalk.yellow(`  Listing for type '${type}' is not yet implemented.`));
      return [];
    }
  }
}

module.exports = CollectionsManager;
