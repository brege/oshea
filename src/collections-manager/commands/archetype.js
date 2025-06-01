// src/collections-manager/commands/archetype.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous operations
const path = require('path');
const os = require('os'); // Not strictly needed here anymore, but good to keep if other OS-specific logic arises
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const { DEFAULT_ARCHETYPE_BASE_DIR_NAME, METADATA_FILENAME } = require('../constants');
const { toPascalCase } = require('../cm-utils');

module.exports = async function archetypePlugin(sourcePluginIdentifier, newArchetypeName, options = {}) {
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Archetyping from '${sourcePluginIdentifier}' to '${newArchetypeName}'. Options: ${JSON.stringify(options)}`));

  let sourcePluginInfo = {};
  let sourceIsDirectPath = false;
  let sourcePluginIdForReplacement = ''; // Crucial for find/replace logic

  if (sourcePluginIdentifier.includes(path.sep) || sourcePluginIdentifier.startsWith('.') || path.isAbsolute(sourcePluginIdentifier)) {
    sourceIsDirectPath = true;
    const resolvedSourcePath = path.resolve(sourcePluginIdentifier);
    if (!fss.existsSync(resolvedSourcePath) || !fss.lstatSync(resolvedSourcePath).isDirectory()) {
      throw new Error(`Source plugin path "${resolvedSourcePath}" not found or is not a directory.`);
    }

    sourcePluginIdForReplacement = path.basename(resolvedSourcePath); // ID for replacement is the dir name
    let configFileName = `${sourcePluginIdForReplacement}.config.yaml`;
    let configPath = path.join(resolvedSourcePath, configFileName);

    if (!fss.existsSync(configPath) || !fss.lstatSync(configPath).isFile()) {
      configFileName = `${sourcePluginIdForReplacement}.yaml`; // Try .yaml
      configPath = path.join(resolvedSourcePath, configFileName);
    }
    if (!fss.existsSync(configPath) || !fss.lstatSync(configPath).isFile()) {
      const filesInDir = fss.readdirSync(resolvedSourcePath);
      const foundConfig = filesInDir.find(f => f.toLowerCase().endsWith('.config.yaml') || f.toLowerCase().endsWith('.yaml'));
      if (foundConfig) {
        configPath = path.join(resolvedSourcePath, foundConfig);
        configFileName = foundConfig;
        if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Found config file '${configFileName}' in direct path source.`));
      } else {
        throw new Error(`Config file (.config.yaml or .yaml) not found in source plugin directory "${resolvedSourcePath}".`);
      }
    }

    sourcePluginInfo = {
      collection: chalk.gray('[direct path source]'),
      plugin_id: sourcePluginIdForReplacement,
      base_path: resolvedSourcePath,
      config_path: configPath,
      description: `Plugin from path: ${sourcePluginIdForReplacement}`
    };
    try {
      const sourceConfigContent = await fs.readFile(configPath, 'utf8');
      const sourceConfigData = yaml.load(sourceConfigContent);
      sourcePluginInfo.description = sourceConfigData.description || sourcePluginInfo.description;
    } catch (e) {
      if (this.debug) console.warn(chalk.yellow(`WARN (CM:archetypePlugin): Could not read description from direct path source config ${configPath}: ${e.message}`));
    }
  } else {
    // Assumed 'collection_name/plugin_id'
    const parts = sourcePluginIdentifier.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid format for sourcePluginIdentifier: "${sourcePluginIdentifier}". Expected "collection_name/plugin_id" or a direct filesystem path.`);
    }
    const sourceCollectionName = parts[0];
    const sourcePluginId = parts[1];
    sourcePluginIdForReplacement = sourcePluginId; // ID for replacement is the plugin_id part

    const availableSourcePlugins = await this.listAvailablePlugins(sourceCollectionName);
    const foundPlugin = availableSourcePlugins.find(p => p.plugin_id === sourcePluginId && p.collection === sourceCollectionName);

    if (!foundPlugin || !foundPlugin.base_path || !foundPlugin.config_path) {
      throw new Error(`Source plugin "${sourcePluginId}" in collection "${sourceCollectionName}" not found or its base_path/config_path is missing.`);
    }
    sourcePluginInfo = { ...foundPlugin }; // Copy to avoid modifying cache
  }

  const sourcePluginBasePath = sourcePluginInfo.base_path;
  const originalSourceConfigFilename = path.basename(sourcePluginInfo.config_path);
  const originalPluginDescriptionFromSource = sourcePluginInfo.description || `Plugin ${sourcePluginIdForReplacement}`;

  let targetBaseDir;
  if (options.targetDir) {
    targetBaseDir = path.resolve(options.targetDir);
  } else {
    // This default is for when createCmd --from <CM_Plugin> is used without --dir.
    // If createCmd is creating from template without --dir, it passes CWD as options.targetDir.
    targetBaseDir = path.join(path.dirname(this.collRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
  }
  const archetypePath = path.join(targetBaseDir, newArchetypeName);

  if (fss.existsSync(archetypePath) && !options.force) {
    throw new Error(`Target archetype directory "${chalk.underline(archetypePath)}" already exists. Use --force to overwrite or choose a different name.`);
  }
  if (fss.existsSync(archetypePath) && options.force) {
    console.log(chalk.yellow(`WARN: Target archetype directory "${chalk.underline(archetypePath)}" already exists. Overwriting due to --force.`));
    await fsExtra.rm(archetypePath, { recursive: true, force: true });
  }

  try {
    await fs.mkdir(targetBaseDir, { recursive: true });
    await fsExtra.copy(sourcePluginBasePath, archetypePath, {
      filter: (src) => {
        // Only skip .collection-metadata.yaml if the source was NOT a direct path
        // (i.e., it was a CM-managed collection).
        if (!sourceIsDirectPath && path.basename(src) === METADATA_FILENAME) {
          if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Skipping copy of ${METADATA_FILENAME} from CM-managed source.`));
          return false;
        }
        return true;
      }
    });
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Copied from ${sourcePluginBasePath} to ${archetypePath}`));

    const originalConfigPathInArchetype = path.join(archetypePath, originalSourceConfigFilename);
    const newConfigFilename = `${newArchetypeName}.config.yaml`; // Standardize to .config.yaml
    const newConfigPathInArchetype = path.join(archetypePath, newConfigFilename);
    let messages = [];

    const sourcePluginIdPascal = toPascalCase(sourcePluginIdForReplacement);
    const newArchetypeNamePascal = toPascalCase(newArchetypeName);
    const filesToProcessForStringReplacement = [];
    const processExtensions = ['.js', '.yaml', '.yml', '.css', '.md'];

    if (fss.existsSync(originalConfigPathInArchetype)) {
      if (originalConfigPathInArchetype.toLowerCase() !== newConfigPathInArchetype.toLowerCase()) { // Case-insensitive check for rename
        await fs.rename(originalConfigPathInArchetype, newConfigPathInArchetype);
        messages.push(`Renamed config file to ${newConfigFilename}.`);
      } else {
        messages.push(`Config file already named appropriately (${newConfigFilename}).`);
      }

      if (processExtensions.includes(path.extname(newConfigFilename).toLowerCase())) {
        filesToProcessForStringReplacement.push(newConfigPathInArchetype);
      }

      let configData = yaml.load(await fs.readFile(newConfigPathInArchetype, 'utf8'));
      configData.description = `Archetype of "${sourcePluginIdentifier}": ${originalPluginDescriptionFromSource}`.trim();
      messages.push(`Updated description in ${newConfigFilename} to reference original source '${sourcePluginIdentifier}'.`);

      if (configData.css_files && Array.isArray(configData.css_files)) {
        const conventionalCssToRename = `${sourcePluginIdForReplacement}.css`;
        const cssIndex = configData.css_files.findIndex(f => typeof f === 'string' && f.toLowerCase() === conventionalCssToRename.toLowerCase());

        if (cssIndex !== -1) {
          const oldCssPathInArchetype = path.join(archetypePath, configData.css_files[cssIndex]); // Use original casing from array
          const newCssName = `${newArchetypeName}.css`;
          const newCssPathInArchetype = path.join(archetypePath, newCssName);


          if (fss.existsSync(oldCssPathInArchetype)) {
            if (oldCssPathInArchetype.toLowerCase() !== newCssPathInArchetype.toLowerCase()) {
              await fs.rename(oldCssPathInArchetype, newCssPathInArchetype);
              messages.push(`Renamed CSS file ${configData.css_files[cssIndex]} to ${newCssName}.`);
            }
            configData.css_files[cssIndex] = newCssName;
            messages.push(`Updated CSS file reference in ${newConfigFilename} to ${newCssName}.`);
            if (processExtensions.includes(path.extname(newCssName).toLowerCase()) && !filesToProcessForStringReplacement.includes(newCssPathInArchetype)) {
              filesToProcessForStringReplacement.push(newCssPathInArchetype);
            }
          } else {
            messages.push(`Conventional CSS file ${configData.css_files[cssIndex]} referenced in config but not found in archetype, reference not updated.`);
          }
        } else {
          messages.push(`No conventional CSS file ('${sourcePluginIdForReplacement}.css') found in css_files array; CSS files and their references in config remain as-is.`);
        }
      }

      const conventionalOldHandlerName = `${sourcePluginIdForReplacement}.js`;
      if (configData.handler_script && configData.handler_script.toLowerCase() === conventionalOldHandlerName.toLowerCase() && conventionalOldHandlerName.toLowerCase() !== 'index.js') {
        const oldHandlerPathInArchetype = path.join(archetypePath, configData.handler_script); // Use original casing
        const newHandlerName = `${newArchetypeName}.js`;
        const newHandlerPathInArchetype = path.join(archetypePath, newHandlerName);

        if (fss.existsSync(oldHandlerPathInArchetype)) {
          if (oldHandlerPathInArchetype.toLowerCase() !== newHandlerPathInArchetype.toLowerCase()) {
            await fs.rename(oldHandlerPathInArchetype, newHandlerPathInArchetype);
            messages.push(`Renamed handler script ${configData.handler_script} to ${newHandlerName}.`);
          }
          configData.handler_script = newHandlerName;
          messages.push(`Updated handler_script in ${newConfigFilename} to ${newHandlerName}.`);
          if (processExtensions.includes(path.extname(newHandlerName).toLowerCase()) && !filesToProcessForStringReplacement.includes(newHandlerPathInArchetype)) {
            filesToProcessForStringReplacement.push(newHandlerPathInArchetype);
          }
        } else {
          messages.push(`Conventional handler script ${configData.handler_script} not found in archetype, reference not updated.`);
        }
      }
      await fs.writeFile(newConfigPathInArchetype, yaml.dump(configData));
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Saved updated config fields in ${newConfigFilename}.`));
    } else {
      messages.push(`Original config file ${originalSourceConfigFilename} not found in copied archetype at ${archetypePath}. Cannot rename or modify.`);
      console.warn(chalk.yellow(`WARN (CM:archetypePlugin): ${messages[messages.length - 1]}`));
    }

    const currentArchetypeFiles = await fs.readdir(archetypePath, { withFileTypes: true });
    for (const dirent of currentArchetypeFiles) {
      const fullFilePath = path.join(archetypePath, dirent.name);
      if (dirent.isFile() && processExtensions.includes(path.extname(dirent.name).toLowerCase()) && !filesToProcessForStringReplacement.includes(fullFilePath)) {
        filesToProcessForStringReplacement.push(fullFilePath);
      }
    }
    const uniqueFilesToProcess = [...new Set(filesToProcessForStringReplacement)];

    if (uniqueFilesToProcess.length > 0) {
      let replacementOccurredInAnyFile = false;
      for (const filePath of uniqueFilesToProcess) {
        if (!fss.existsSync(filePath)) {
          if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin SR): File ${path.basename(filePath)} not found for string replacement (may have been renamed earlier).`));
          continue;
        }
        try {
          let fileContent = await fs.readFile(filePath, 'utf8');
          let originalFileContentForCompare = fileContent;
          
          if (sourcePluginIdForReplacement && sourcePluginIdForReplacement !== newArchetypeName) {
            const regexId = new RegExp(sourcePluginIdForReplacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            fileContent = fileContent.replace(regexId, newArchetypeName);
          }
          if (sourcePluginIdPascal && newArchetypeNamePascal && sourcePluginIdPascal !== newArchetypeNamePascal) {
            const regexPascal = new RegExp(sourcePluginIdPascal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            fileContent = fileContent.replace(regexPascal, newArchetypeNamePascal);
          }

          if (fileContent !== originalFileContentForCompare) {
            if (filePath.toLowerCase() === newConfigPathInArchetype.toLowerCase()) { // If it's the main config
              let tempConfigData = yaml.load(fileContent);
              tempConfigData.description = `Archetype of "${sourcePluginIdentifier}": ${originalPluginDescriptionFromSource}`.trim();
              fileContent = yaml.dump(tempConfigData);
            }
            await fs.writeFile(filePath, fileContent);
            if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin SR): Performed string replacements in ${path.basename(filePath)}.`));
            replacementOccurredInAnyFile = true;
          }
        } catch (srError) {
          messages.push(`Error processing content in ${path.basename(filePath)}: ${srError.message.substring(0, 30)}...`);
          console.warn(chalk.yellow(`WARN (CM:archetypePlugin): Failed to process content in ${filePath}: ${srError.message}`));
        }
      }
      if (replacementOccurredInAnyFile) {
        messages.push(`Performed string replacements in archetype files.`);
      }
    }

    const readmePath = path.join(archetypePath, 'README.md');
    if (fss.existsSync(readmePath)) {
      try {
        const originalReadmeContent = await fs.readFile(readmePath, 'utf8');
        const { data: fmData, content: mainReadmeContent } = matter(originalReadmeContent);
        const archetypeNotePattern = /\n\*\*Note:\*\* This is an archetype of the "[^"]+" plugin, created as "[^"]+"\..*?\n/gs;
        const cleanMainReadmeContent = mainReadmeContent.replace(archetypeNotePattern, '');
        const archetypeNote = `\n**Note:** This is an archetype of the "${sourcePluginIdentifier}" plugin, created as "${newArchetypeName}". You may need to update its content, registration paths, and internal references if you customize it further.\n`;
        let newReadmeContent = Object.keys(fmData).length > 0 ? `---\n${yaml.dump(fmData)}---\n` : '';
        newReadmeContent += `${cleanMainReadmeContent}${archetypeNote}`;
        await fs.writeFile(readmePath, newReadmeContent);
        messages.push("Updated README.md with an archetype note.");
      } catch (readmeError) {
        messages.push(`Failed to update README.md: ${readmeError.message}`);
        console.warn(chalk.yellow(`WARN (CM:archetypePlugin): Failed to update README.md: ${readmeError.message}`));
      }
    }

    const exampleMdPattern = new RegExp(`^${sourcePluginIdForReplacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([-_])example\\.md$`, 'i');
    const newExampleMdName = `${newArchetypeName}-example.md`;
    const finalListOfFiles = await fs.readdir(archetypePath); // Re-read in case of renames

    for (const fileName of finalListOfFiles) {
      if (exampleMdPattern.test(fileName)) {
        const oldExampleMdPath = path.join(archetypePath, fileName);
        const newExampleMdPathInArchetype = path.join(archetypePath, newExampleMdName);
        if (oldExampleMdPath.toLowerCase() !== newExampleMdPathInArchetype.toLowerCase()) {
          await fs.rename(oldExampleMdPath, newExampleMdPathInArchetype);
          messages.push(`Renamed example Markdown file ${fileName} to ${newExampleMdName}.`);
        }
        // Content replacement for example.md was handled by the general string replacement loop.
        break;
      }
    }

    const successMessage = `Archetype '${newArchetypeName}' created successfully from '${sourcePluginIdentifier}'.`;
    if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Archetype creation operations: ${messages.join('; ')}`));
    console.log(chalk.green(successMessage));
    return { success: true, message: successMessage, archetypePath: archetypePath };

  } catch (error) {
    console.error(chalk.red(`ERROR (CM:archetypePlugin): Failed during archetype creation for '${newArchetypeName}': ${error.message}`));
    if (this.debug && error.stack && !error.message.includes('Target archetype directory') && !error.message.includes('not found')) {
      console.error(chalk.red(error.stack));
    }
    if (fss.existsSync(archetypePath) && !options.targetDir && !options.force) {
      try {
        await fsExtra.rm(archetypePath, { recursive: true, force: true });
        console.log(chalk.yellow(`INFO (CM:archetypePlugin): Cleaned up partially created archetype directory: ${archetypePath}`));
      } catch (cleanupError) {
        console.error(chalk.red(`ERROR (CM:archetypePlugin): Failed to cleanup partially created archetype directory ${archetypePath}: ${cleanupError.message}`));
      }
    }
    throw error;
  }
};
