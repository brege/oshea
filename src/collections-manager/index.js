// dev/src/collections-manager/index.js
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
          source: originalSource, // Store the original source (could be local .git path or URL)
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

      // Updated condition to treat local paths ending in .git as cloneable
      if (/^(http(s)?:\/\/|git@)/.test(source) || (typeof source === 'string' && source.endsWith('.git') && fss.existsSync(path.resolve(source)))) {
        const sourceToClone = /^(http(s)?:\/\/|git@)/.test(source) ? source : path.resolve(source);
        console.log(chalk.blue(`  Source is a Git repository. Attempting to clone with git from '${sourceToClone}'...`));
        const gitProcess = spawn('git', ['clone', sourceToClone, targetPath], { stdio: 'pipe' });
        
        gitProcess.stdout.on('data', (data) => {
          process.stdout.write(chalk.gray(`  GIT: ${data}`));
        });
        gitProcess.stderr.on('data', (data) => {
          process.stderr.write(chalk.yellowBright(`  GIT (stderr): ${data}`));
        });

        gitProcess.on('close', async (code) => {
          if (code === 0) {
            console.log(chalk.green(`\n  Successfully cloned '${sourceToClone}' to '${targetPath}'.`));
            await writeMetadata();
            resolve(targetPath);
          } else {
            console.error(chalk.red(`\n  ERROR: Git clone failed with exit code ${code} for source '${sourceToClone}'.`));
            reject(new Error(`Git clone failed with exit code ${code}.`));
          }
        });
        gitProcess.on('error', (err) => {
          console.error(chalk.red(`\n  ERROR: Failed to start git process for cloning '${sourceToClone}': ${err.message}`));
          reject(err);
        });
      } else { // Handle as a simple local directory copy
        const absoluteSourcePath = path.resolve(source);
        console.log(chalk.blue(`  Source is a non-Git local path: ${chalk.underline(absoluteSourcePath)}. Attempting to copy...`));
        if (!fss.existsSync(absoluteSourcePath)) {
          console.error(chalk.red(`  ERROR: Local source path does not exist: ${absoluteSourcePath}`));
          return reject(new Error(`Local source path does not exist: ${absoluteSourcePath}`));
        }
        try {
          await fsExtra.copy(absoluteSourcePath, targetPath);
          console.log(chalk.green(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`));
          await writeMetadata(); // Still write metadata, source will be the local path
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
    if (!pluginToEnable.config_path || !fss.existsSync(pluginToEnable.config_path)) { 
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

  async disablePlugin(invokeName) {
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:disablePlugin): Disabling invoke_name: ${invokeName}`));

    const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
    let enabledManifest = { enabled_plugins: [] };

    if (!fss.existsSync(enabledManifestPath)) {
      console.log(chalk.yellow(`No plugins are currently enabled (manifest not found). Cannot disable "${invokeName}".`));
      return { success: false, message: `No plugins enabled. Cannot disable "${invokeName}".` };
    }

    try {
      const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
      enabledManifest = yaml.load(manifestContent);
      if (!enabledManifest || !Array.isArray(enabledManifest.enabled_plugins)) {
        console.log(chalk.yellow(`Enabled plugins manifest is invalid or empty. Cannot disable "${invokeName}".`));
        return { success: false, message: `Enabled plugins manifest invalid. Cannot disable "${invokeName}".` };
      }
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:disablePlugin): Could not read or parse ${enabledManifestPath}: ${e.message}`));
      throw e;
    }

    const initialLength = enabledManifest.enabled_plugins.length;
    enabledManifest.enabled_plugins = enabledManifest.enabled_plugins.filter(
      p => p.invoke_name !== invokeName
    );

    if (enabledManifest.enabled_plugins.length === initialLength) {
      console.log(chalk.yellow(`Plugin with invoke name "${invokeName}" not found among enabled plugins.`));
      return { success: false, message: `Plugin invoke name "${invokeName}" not found.` };
    }

    try {
      const yamlString = yaml.dump(enabledManifest, { sortKeys: true });
      await fs.writeFile(enabledManifestPath, yamlString);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:disablePlugin): Successfully wrote updated manifest to ${enabledManifestPath}`));
      console.log(chalk.green(`Plugin "${invokeName}" disabled successfully.`));
      return { success: true, message: `Plugin "${invokeName}" disabled.` };
    } catch (e) {
      console.error(chalk.red(`ERROR (CM:disablePlugin): Failed to write updated manifest to ${enabledManifestPath}: ${e.message}`));
      throw e;
    }
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

    const enabledManifestPath = path.join(this.collRoot, ENABLED_MANIFEST_FILENAME);
    let enabledPluginsFromThisCollection = [];

    if (fss.existsSync(enabledManifestPath)) {
      try {
        const manifestContent = await fs.readFile(enabledManifestPath, 'utf8');
        const enabledManifest = yaml.load(manifestContent);
        if (enabledManifest && Array.isArray(enabledManifest.enabled_plugins)) {
          enabledPluginsFromThisCollection = enabledManifest.enabled_plugins.filter(
            p => p.collection_name === collectionName
          );
        }
      } catch (e) {
        console.warn(chalk.yellow(`WARN (CM:removeCollection): Could not read or parse ${enabledManifestPath} while checking for enabled plugins from ${collectionName}: ${e.message}`));
      }
    }

    if (enabledPluginsFromThisCollection.length > 0 && !options.force) {
      const pluginNames = enabledPluginsFromThisCollection.map(p => `"${p.invoke_name}" (from ${p.plugin_id})`).join(', ');
      throw new Error(`Collection "${collectionName}" has enabled plugins: ${pluginNames}. Please disable them first or use the --force option.`);
    }

    if (options.force && enabledPluginsFromThisCollection.length > 0) {
      console.log(chalk.yellow(`  Force removing. Disabling plugins from "${collectionName}":`));
      let manifestChanged = false;
      let currentEnabledManifest = yaml.load(await fs.readFile(enabledManifestPath, 'utf8'));
      
      for (const plugin of enabledPluginsFromThisCollection) {
        console.log(chalk.yellow(`    - Disabling "${plugin.invoke_name}"...`));
        const initialLength = currentEnabledManifest.enabled_plugins.length;
        currentEnabledManifest.enabled_plugins = currentEnabledManifest.enabled_plugins.filter(p => p.invoke_name !== plugin.invoke_name);
        if (currentEnabledManifest.enabled_plugins.length < initialLength) {
            manifestChanged = true;
        }
      }
      if (manifestChanged) {
          const yamlString = yaml.dump(currentEnabledManifest, { sortKeys: true });
          await fs.writeFile(enabledManifestPath, yamlString);
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

    const metadataPath = path.join(collectionPath, METADATA_FILENAME);
    if (!fss.existsSync(metadataPath)) {
      console.warn(chalk.yellow(`WARN: Metadata file not found for collection "${collectionName}". Cannot determine source for update.`));
      return { success: false, message: `Metadata not found for "${collectionName}".` };
    }

    let metadata;
    try {
      const metaContent = await fs.readFile(metadataPath, 'utf8');
      metadata = yaml.load(metaContent);
    } catch (e) {
      console.error(chalk.red(`ERROR: Could not read or parse metadata for "${collectionName}": ${e.message}`));
      return { success: false, message: `Error reading metadata for "${collectionName}".` };
    }
    
    // For update, the source must be a Git repository (either remote URL or local .git path)
    if (!metadata.source || !(/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')))) {
      console.log(chalk.yellow(`Collection "${collectionName}" (source: ${metadata.source}) was not added from a recognized Git source. Automatic update not applicable.`));
      return { success: true, message: `Collection "${collectionName}" not from a recognized Git source.` }; 
    }

    console.log(chalk.blue(`Updating collection "${collectionName}" from Git source: ${chalk.underline(metadata.source)}...`));

    return new Promise((resolve, reject) => {
      // Ensure 'git pull' is executed within the collection's directory itself
      const gitProcess = spawn('git', ['pull'], { cwd: collectionPath, stdio: 'pipe' });

      gitProcess.stdout.on('data', (data) => {
        process.stdout.write(chalk.gray(`  GIT (${collectionName}): ${data}`));
      });
      gitProcess.stderr.on('data', (data) => {
        process.stderr.write(chalk.yellowBright(`  GIT (${collectionName}, stderr): ${data}`));
      });

      gitProcess.on('close', async (code) => {
        if (code === 0) {
          console.log(chalk.green(`\n  Successfully updated collection "${collectionName}".`));
          metadata.updated_on = new Date().toISOString();
          try {
            const yamlString = yaml.dump(metadata);
            await fs.writeFile(metadataPath, yamlString);
            if (this.debug) console.log(chalk.magenta(`  DEBUG: Updated metadata for ${collectionName} with new timestamp.`));
            resolve({ success: true, message: `Collection "${collectionName}" updated.` });
          } catch (metaError) {
            console.warn(chalk.yellow(`  WARN: Could not update metadata timestamp for ${collectionName}: ${metaError.message}`));
            resolve({ success: true, message: `Collection "${collectionName}" updated, but metadata timestamp failed.` });
          }
        } else {
          console.error(chalk.red(`\n  ERROR: Git pull failed for collection "${collectionName}" with exit code ${code}.`));
          // Do not reject, let the CLI handle reporting this specific error to the user as a failed update attempt.
          resolve({ success: false, message: `Git pull failed for "${collectionName}" with exit code ${code}.`});
        }
      });
      gitProcess.on('error', (err) => {
        console.error(chalk.red(`\n  ERROR: Failed to start git process for updating "${collectionName}": ${err.message}`));
        // Do not reject, let the CLI handle reporting.
        resolve({ success: false, message: `Failed to start git process for updating "${collectionName}": ${err.message}` });
      });
    });
  }
  
  async updateAllCollections() {
    if (this.debug) console.log(chalk.magenta("DEBUG (CM:updateAllCollections): Attempting to update all Git-based collections."));
    let allOverallSuccess = true; // Tracks if all attempts initiated successfully and reported success from updateCollection
    let updateMessages = [];

    const downloadedCollections = await this.listCollections('downloaded'); // This already logs "Downloaded plugin collections:"
    if (!downloadedCollections || downloadedCollections.length === 0) { // listCollections returns [] if none
        console.log(chalk.yellow("No collections are currently downloaded. Nothing to update."));
        return { success: true, messages: ["No collections downloaded."]};
    }
    
    console.log(chalk.blue("Processing updates for downloaded collections:"));

    for (const collectionName of downloadedCollections) {
        const collectionPath = path.join(this.collRoot, collectionName);
        const metadataPath = path.join(collectionPath, METADATA_FILENAME);

        if (!fss.existsSync(metadataPath)) {
            const skipMsg = `Skipping ${collectionName}: No metadata file found.`;
            console.log(chalk.yellow(`  ${skipMsg}`));
            updateMessages.push(skipMsg);
            continue;
        }
        let metadata;
        try {
            metadata = yaml.load(await fs.readFile(metadataPath, 'utf8'));
        } catch (e) {
            const errMsg = `Skipping ${collectionName}: Error reading metadata. ${e.message}`;
            console.error(chalk.red(`  ${errMsg}`));
            updateMessages.push(errMsg);
            allOverallSuccess = false;
            continue;
        }

        if (metadata && metadata.source && (/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')) )) {
            try {
                // updateCollection logs its own "Attempting to update..." and success/failure
                const result = await this.updateCollection(collectionName); 
                updateMessages.push(result.message);
                if (!result.success) allOverallSuccess = false;
            } catch (error) { // Should ideally not be hit if updateCollection resolves consistently
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
    // Removed the initial console.log from here as it's often duplicated by calling CLI
    // console.log(chalk.blue(`CollectionsManager: Listing (type: ${chalk.yellow(type)}, filter: ${chalk.yellow(collectionNameFilter || 'all')})`));
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
          // This specific logging is better handled by the CLI layer
          // console.log(chalk.blue("  Downloaded plugin collections:"));
          // collections.forEach(name => console.log(chalk.greenBright(`    - ${name}`)));
        }
        return collections; // Return the array for the CLI to format
      } catch (error) {
        console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
        throw error;
      }
    } else if (type === 'available') {
        const availablePlugins = await this.listAvailablePlugins(collectionNameFilter);
        // CLI will handle formatting and printing
        return availablePlugins; // Return data for CLI to format
        
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
        // CLI will handle formatting and printing
        return pluginsToDisplay; // Return data for CLI to format

    } else {
      console.log(chalk.yellow(`  Listing for type '${type}' is not yet implemented.`));
      return []; // Return empty for unimplemented types
    }
  }
}

module.exports = CollectionsManager;
