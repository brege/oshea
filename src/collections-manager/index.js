// dev/src/collections-manager/index.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous checks like existsSync
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const crypto = require('crypto');
const { deriveCollectionName } = require('./cm-utils');

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

  async _readEnabledManifest() {
    const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
    let enabledManifest = { enabled_plugins: [] };
    try {
      if (fss.existsSync(enabledManifestPath)) {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        const loadedData = yaml.load(manifestContent);
        if (loadedData && Array.isArray(loadedData.enabled_plugins)) {
          enabledManifest = loadedData;
        } else {
          if (this.debug && loadedData) console.warn(chalk.yellow(`WARN (CM:_readEnabledManifest): Invalid structure in ${ENABLED_MANIFEST_FILENAME}. Re-initializing.`));
        }
      } else {
        if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_readEnabledManifest): ${ENABLED_MANIFEST_FILENAME} not found. Initializing new one.`));
      }
    } catch (e) {
      console.warn(chalk.yellow(`WARN (CM:_readEnabledManifest): Could not read or parse ${enabledManifestPath}: ${e.message}. Starting with a new manifest.`));
    }
    return enabledManifest;
  }

  async _writeEnabledManifest(manifestData) {
    const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      const yamlString = yaml.dump(manifestData, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_writeEnabledManifest): Successfully wrote to ${enabledManifestPath}`));
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:_writeEnabledManifest): Failed to write to ${enabledManifestPath}: ${e.message}`));
      throw e;
    }
  }

  async _readCollectionMetadata(collectionName) {
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, METADATA_FILENAME);
    if (!fss.existsSync(metadataPath)) {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_readCollMeta): Metadata file not found for ${collectionName} at ${metadataPath}`));
      return null;
    }
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      return yaml.load(metaContent);
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:_readCollMeta): Could not read or parse metadata for "${collectionName}": ${e.message}`));
      throw e;
    }
  }

  async _writeCollectionMetadata(collectionName, metadataContent) {
    const collectionPath = path.join(this.collRoot, collectionName);
    const metadataPath = path.join(collectionPath, METADATA_FILENAME);
    try {
      await fs.mkdir(collectionPath, { recursive: true });
      const yamlString = yaml.dump(metadataContent);
      await fs.writeFile(metadataPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_writeCollMeta): Wrote metadata to ${metadataPath}`));
    } catch (metaError) {
      console.warn(chalk.yellow(`WARN (CM:_writeCollMeta): Could not write collection metadata for ${collectionName}: ${metaError.message}`));
      throw metaError;
    }
  }

  _spawnGitProcess(gitArgs, cwd, operationDescription) {
    return new Promise((resolve, reject) => {
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:_spawnGit): Spawning git with args: [${gitArgs.join(' ')}] in ${cwd} for ${operationDescription}`));
      const gitProcess = spawn('git', gitArgs, { cwd, stdio: 'pipe' });

      gitProcess.stdout.on('data', (data) => {
        process.stdout.write(chalk.gray(`  GIT (${operationDescription}): ${data}`));
      });
      gitProcess.stderr.on('data', (data) => {
        process.stderr.write(chalk.yellowBright(`  GIT (${operationDescription}, stderr): ${data}`));
      });

      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          console.error(chalk.red(`\n  ERROR: Git operation '${gitArgs[0]}' for ${operationDescription} failed with exit code ${code}.`));
          reject(new Error(`Git ${gitArgs[0]} failed for ${operationDescription} with exit code ${code}.`));
        }
      });
      gitProcess.on('error', (err) => {
        console.error(chalk.red(`\n  ERROR: Failed to start git process for ${operationDescription}: ${err.message}`));
        reject(err);
      });
    });
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
      throw error; // Re-throw to halt execution if COLL_ROOT cannot be created
    }

    const collectionName = options.name || deriveCollectionName(source);
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
    const createInitialMetadata = () => ({
      source: originalSource,
      name: collectionName,
      added_on: new Date().toISOString(),
    });

    if (/^(http(s)?:\/\/|git@)/.test(source) || (typeof source === 'string' && source.endsWith('.git') && fss.existsSync(path.resolve(source)))) {
      const sourceToClone = /^(http(s)?:\/\/|git@)/.test(source) ? source : path.resolve(source);
      console.log(chalk.blue(`  Source is a Git repository. Attempting to clone with git from '${sourceToClone}'...`));
      try {
        await this._spawnGitProcess(['clone', sourceToClone, targetPath], this.collRoot, `cloning ${collectionName}`);
        console.log(chalk.green(`\n  Successfully cloned '${sourceToClone}' to '${targetPath}'.`));
        await this._writeCollectionMetadata(collectionName, createInitialMetadata());
        return targetPath;
      } catch (error) {
        // Error already logged by _spawnGitProcess or _writeCollectionMetadata
        throw error; // Re-throw to ensure calling context knows it failed
      }
    } else {
      const absoluteSourcePath = path.resolve(source);
      console.log(chalk.blue(`  Source is a non-Git local path: ${chalk.underline(absoluteSourcePath)}. Attempting to copy...`));
      if (!fss.existsSync(absoluteSourcePath)) {
        const errMsg = `Local source path does not exist: ${absoluteSourcePath}`;
        console.error(chalk.red(`  ERROR: ${errMsg}`));
        throw new Error(errMsg);
      }
      try {
        await fsExtra.copy(absoluteSourcePath, targetPath);
        console.log(chalk.green(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`));
        await this._writeCollectionMetadata(collectionName, createInitialMetadata());
        return targetPath;
      } catch (error) {
        console.error(chalk.red(`  ERROR: Failed to copy local source '${absoluteSourcePath}' to '${targetPath}': ${error.message}`));
        throw error;
      }
    }
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
    if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) {
        throw new Error(`Config path for plugin "${pluginId}" in collection "${collectionName}" is invalid or not found: ${pluginToEnable.config_path}`);
    }
    const absolutePluginConfigPath = pluginToEnable.config_path;

    let invokeName = options.name || pluginId;
    if (!/^[a-zA-Z0-9_.-]+$/.test(invokeName)) {
        throw new Error(`Invalid invoke_name: "${invokeName}". Must be alphanumeric, underscores, hyphens, or periods.`);
    }

    const enabledManifest = await this._readEnabledManifest();

    if (enabledManifest.enabled_plugins.some(p => p.invoke_name === invokeName)) {
      throw new Error(`Invoke name "${invokeName}" is already in use. Choose a different name using --name.`);
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

    await this._writeEnabledManifest(enabledManifest);
    console.log(chalk.green(`Plugin "${collectionName}/${pluginId}" enabled successfully as "${invokeName}".`));
    return { success: true, message: `Plugin "${collectionName}/${pluginId}" enabled as "${invokeName}".`, invoke_name: invokeName };
  }

  async enableAllPluginsInCollection(collectionName, options = {}) {
    // ... (content unchanged, but uses _readCollectionMetadata and _enablePlugin which now use helpers) ...
    // For brevity, keeping this method's internal logic visually collapsed here, as it's mostly calls to other methods.
    // The internal prefix determination logic using _readCollectionMetadata would implicitly benefit.
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:enableAllPluginsInCollection): Enabling all plugins in: ${collectionName}, options: ${JSON.stringify(options)}`));
    const collectionPath = path.join(this.collRoot, collectionName);
    if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
        console.error(chalk.red(`ERROR: Collection "${collectionName}" not found at ${collectionPath}.`));
        return { success: false, messages: [`Collection "${collectionName}" not found.`] };
    }

    const availablePlugins = await this.listAvailablePlugins(collectionName);
    if (!availablePlugins || availablePlugins.length === 0) {
        console.log(chalk.yellow(`No available plugins found in collection "${collectionName}".`));
        return { success: true, messages: [`No available plugins found in "${collectionName}".`] };
    }

    let defaultPrefixToUse = "";
    if (!options.noPrefix && !(options.prefix && typeof options.prefix === 'string')) {
        const metadata = await this._readCollectionMetadata(collectionName); // Uses helper
        if (metadata && metadata.source) {
            const source = metadata.source;
            const gitHubHttpsMatch = source.match(/^https?:\/\/github\.com\/([^\/]+)\/[^\/.]+(\.git)?$/);
            const gitHubSshMatch = source.match(/^git@github\.com:([^\/]+)\/[^\/.]+(\.git)?$/);

            if (gitHubHttpsMatch && gitHubHttpsMatch[1]) defaultPrefixToUse = `${gitHubHttpsMatch[1]}-`;
            else if (gitHubSshMatch && gitHubSshMatch[1]) defaultPrefixToUse = `${gitHubSshMatch[1]}-`;
            else if (/^(http(s)?:\/\/|git@)/.test(source)) {
                defaultPrefixToUse = `${collectionName}-`;
                if (this.debug || !options.isCliCall) console.warn(chalk.yellow(`  WARN: Could not extract username from Git URL "${source}". Using collection name "${collectionName}" as prefix.`));
            }
        } else {
            if (this.debug && !metadata && fss.existsSync(path.join(collectionPath, METADATA_FILENAME))) console.warn(chalk.yellow(`WARN: Metadata for ${collectionName} exists but couldn't be read for prefix.`));
            else if (this.debug) console.log(chalk.magenta(`DEBUG: Metadata file/source not found for ${collectionName}, defaulting to no prefix.`));
        }
    }

    const results = [];
    let allSucceeded = true;
    let countEnabled = 0;

    for (const plugin of availablePlugins) {
        const collectionPluginId = `${plugin.collection}/${plugin.plugin_id}`;
        let invokeName;

        if (options.noPrefix) invokeName = plugin.plugin_id;
        else if (options.prefix && typeof options.prefix === 'string') invokeName = `${options.prefix}${plugin.plugin_id}`;
        else invokeName = `${defaultPrefixToUse}${plugin.plugin_id}`;

        try {
            const enableResult = await this.enablePlugin(collectionPluginId, { name: invokeName }); // Uses helper
            results.push({ plugin: collectionPluginId, invoke_name: enableResult.invoke_name, status: 'enabled', message: enableResult.message });
            countEnabled++;
        } catch (error) {
            allSucceeded = false;
            results.push({ plugin: collectionPluginId, invoke_name: invokeName, status: 'failed', message: error.message });
            console.warn(chalk.yellow(`  Failed to enable ${collectionPluginId} as ${invokeName}: ${error.message}`));
        }
    }

    const summaryMessage = `Batch enablement for collection "${collectionName}": ${countEnabled} of ${availablePlugins.length} plugins enabled.`;
    console.log(chalk.blueBright(summaryMessage));
    results.forEach(r => {
        if (r.status === 'enabled') console.log(chalk.green(`  - ${r.invoke_name} (from ${r.plugin}) : ${r.status}`));
        else console.log(chalk.yellow(`  - ${r.invoke_name} (from ${r.plugin}) : ${r.status} - ${r.message}`));
    });

    return { success: allSucceeded, messages: [summaryMessage, ...results.map(r => `${r.invoke_name}: ${r.status} - ${r.message}`)] };
  }


  async disablePlugin(invokeName) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:disablePlugin): Disabling invoke_name: ${invokeName}`));
    const enabledManifest = await this._readEnabledManifest();

    if (enabledManifest.enabled_plugins.length === 0) {
      console.log(chalk.yellow(`No plugins are currently enabled. Cannot disable "${invokeName}".`));
      return { success: false, message: `No plugins enabled. Cannot disable "${invokeName}".` };
    }

    const initialLength = enabledManifest.enabled_plugins.length;
    enabledManifest.enabled_plugins = enabledManifest.enabled_plugins.filter(p => p.invoke_name !== invokeName);

    if (enabledManifest.enabled_plugins.length === initialLength) {
      console.log(chalk.yellow(`Plugin with invoke name "${invokeName}" not found among enabled plugins.`));
      return { success: false, message: `Plugin invoke name "${invokeName}" not found.` };
    }

    await this._writeEnabledManifest(enabledManifest);
    console.log(chalk.green(`Plugin "${invokeName}" disabled successfully.`));
    return { success: true, message: `Plugin "${invokeName}" disabled.` };
  }

  async removeCollection(collectionName, options = {}) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection): Removing collection: ${collectionName}, options: ${JSON.stringify(options)}`));
    const collectionPath = path.join(this.collRoot, collectionName);

    if (!fss.existsSync(collectionPath)) {
      throw new Error(`Collection "${collectionName}" not found at ${collectionPath}.`);
    }
    if (!fss.lstatSync(collectionPath).isDirectory()) {
      throw new Error(`Target "${collectionName}" at ${collectionPath} is not a directory.`);
    }

    let enabledManifest = await this._readEnabledManifest();
    const enabledPluginsFromThisCollection = enabledManifest.enabled_plugins.filter(p => p.collection_name === collectionName);

    if (enabledPluginsFromThisCollection.length > 0 && !options.force) {
      const pluginNames = enabledPluginsFromThisCollection.map(p => `"${p.invoke_name}" (from ${p.plugin_id})`).join(', ');
      throw new Error(`Collection "${collectionName}" has enabled plugins: ${pluginNames}. Please disable them first or use the --force option.`);
    }

    if (options.force && enabledPluginsFromThisCollection.length > 0) {
      console.log(chalk.yellow(`  Force removing. Disabling plugins from "${collectionName}":`));
      let manifestChanged = false;
      for (const plugin of enabledPluginsFromThisCollection) {
        console.log(chalk.yellow(`    - Disabling "${plugin.invoke_name}"...`));
        const initialLength = enabledManifest.enabled_plugins.length;
        enabledManifest.enabled_plugins = enabledManifest.enabled_plugins.filter(p => p.invoke_name !== plugin.invoke_name);
        if (enabledManifest.enabled_plugins.length < initialLength) manifestChanged = true;
      }
      if (manifestChanged) {
        await this._writeEnabledManifest(enabledManifest);
        if (this.debug) console.log(chalk.magenta(`DEBUG (CM:removeCollection --force): Wrote updated manifest after disabling plugins.`));
      }
    }

    try {
      await fsExtra.rm(collectionPath, { recursive: true, force: true });
      console.log(chalk.green(`Collection "${collectionName}" removed successfully from ${this.collRoot}.`));
      return { success: true, message: `Collection "${collectionName}" removed.` };
    } catch (error) {
      console.error(chalk.red(`ERROR (CM:removeCollection): Failed to remove collection directory ${collectionPath}: ${error.message}`));
      throw error;
    }
  }

  async updateCollection(collectionName) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:updateCollection): Updating collection: ${collectionName}`));
    const collectionPath = path.join(this.collRoot, collectionName);

    if (!fss.existsSync(collectionPath)) {
      console.error(chalk.red(`ERROR: Collection "${collectionName}" not found at ${collectionPath}. Cannot update.`));
      return { success: false, message: `Collection "${collectionName}" not found.` };
    }

    const metadata = await this._readCollectionMetadata(collectionName);
    if (!metadata) {
      console.warn(chalk.yellow(`WARN: Metadata file not found or unreadable for collection "${collectionName}". Cannot determine source for update.`));
      return { success: false, message: `Metadata not found or unreadable for "${collectionName}".` };
    }

    if (!metadata.source || !(/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')))) {
      console.log(chalk.yellow(`Collection "${collectionName}" (source: ${metadata.source}) was not added from a recognized Git source. Automatic update not applicable.`));
      return { success: true, message: `Collection "${collectionName}" not from a recognized Git source.` };
    }

    console.log(chalk.blue(`Updating collection "${collectionName}" from Git source: ${chalk.underline(metadata.source)}...`));

    try {
      await this._spawnGitProcess(['pull'], collectionPath, `pulling ${collectionName}`);
      console.log(chalk.green(`\n  Successfully updated collection "${collectionName}".`));
      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      return { success: true, message: `Collection "${collectionName}" updated.` };
    } catch (error) {
      // Error already logged by _spawnGitProcess or _writeCollectionMetadata
      return { success: false, message: error.message };
    }
  }

  async updateAllCollections() {
    if (this.debug) console.log(chalk.magenta("DEBUG (CM:updateAllCollections): Attempting to update all Git-based collections."));
    let allOverallSuccess = true;
    let updateMessages = [];

    const downloadedCollections = await this.listCollections('downloaded');
    if (!downloadedCollections || downloadedCollections.length === 0) {
        console.log(chalk.yellow("No collections are currently downloaded. Nothing to update."));
        return { success: true, messages: ["No collections downloaded."]};
    }

    console.log(chalk.blue("Processing updates for downloaded collections:"));

    for (const collectionName of downloadedCollections) {
        const metadata = await this._readCollectionMetadata(collectionName);

        if (!metadata) {
            const skipMsg = `Skipping ${collectionName}: Metadata file not found or unreadable.`;
            console.log(chalk.yellow(`  ${skipMsg}`));
            updateMessages.push(skipMsg);
            continue;
        }

        if (metadata.source && (/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')) )) {
            try {
                const result = await this.updateCollection(collectionName); // Uses helper
                updateMessages.push(result.message);
                if (!result.success) allOverallSuccess = false;
            } catch (error) {
                const errMsg = `Failed to update ${collectionName}: ${error.message}`;
                console.error(chalk.red(`  ${errMsg}`));
                updateMessages.push(errMsg);
                allOverallSuccess = false;
            }
        } else {
            const skipMsg = `Skipping ${collectionName}: Not a Git-based collection (source: ${metadata.source || 'N/A'}).`;
            console.log(chalk.yellow(`  ${skipMsg}`));
            updateMessages.push(skipMsg);
        }
    }
    console.log(chalk.blueBright("\nFinished attempting to update all collections."));
    return { success: allOverallSuccess, messages: updateMessages };
  }


  async _findPluginsInCollectionDir(collectionPath, collectionName) {
    const availablePlugins = [];
    if (!fss.existsSync(collectionPath) || !fss.lstatSync(collectionPath).isDirectory()) {
      return [];
    }

    const pluginDirs = await fs.readdir(collectionPath, { withFileTypes: true });
    for (const pluginDir of pluginDirs) {
      if (pluginDir.isDirectory()) {
        const pluginId = pluginDir.name;
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
    if (type === 'downloaded') {
      try {
        if (!fss.existsSync(this.collRoot)) {
          return [];
        }
        const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
        let collections = entries
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        collections.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        return collections;
      } catch (error) {
        console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
        throw error;
      }
    } else if (type === 'available') {
        const availablePlugins = await this.listAvailablePlugins(collectionNameFilter);
        return availablePlugins;
    } else if (type === 'enabled') {
        const enabledManifest = await this._readEnabledManifest(); // Uses helper
        let pluginsToDisplay = enabledManifest.enabled_plugins;

        if (collectionNameFilter) {
            pluginsToDisplay = pluginsToDisplay.filter(p => p.collection_name === collectionNameFilter);
        }

        pluginsToDisplay.sort((a,b) => a.invoke_name.toLowerCase().localeCompare(b.invoke_name.toLowerCase()));
        return pluginsToDisplay;
    } else {
      console.log(chalk.yellow(`  Listing for type '${type}' is not yet implemented in manager.`));
      return [];
    }
  }
}

module.exports = CollectionsManager;
