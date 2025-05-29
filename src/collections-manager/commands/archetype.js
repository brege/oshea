// dev/src/collections-manager/commands/archetype.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const os = require('os');
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const matter = require('gray-matter'); // For README processing
const { DEFAULT_ARCHETYPE_BASE_DIR_NAME } = require('../constants');
const { toPascalCase } = require('../cm-utils'); 

module.exports = async function archetypePlugin(sourcePluginIdentifier, newArchetypeName, options = {}) {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Creating archetype from ${sourcePluginIdentifier} as ${newArchetypeName} with options ${JSON.stringify(options)}`));

  const parts = sourcePluginIdentifier.split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid format for sourcePluginIdentifier: "${sourcePluginIdentifier}". Expected "collection_name/plugin_id".`);
  }
  const sourceCollectionName = parts[0];
  const sourcePluginId = parts[1];

  const availableSourcePlugins = await this.listAvailablePlugins(sourceCollectionName);
  const sourcePluginInfo = availableSourcePlugins.find(p => p.plugin_id === sourcePluginId && p.collection === sourceCollectionName);

  if (!sourcePluginInfo || !sourcePluginInfo.base_path || !sourcePluginInfo.config_path) {
    throw new Error(`Source plugin "${sourcePluginId}" in collection "${sourceCollectionName}" not found or its base_path/config_path is missing.`);
  }
  const sourcePluginBasePath = sourcePluginInfo.base_path;
  const originalSourceConfigFilename = path.basename(sourcePluginInfo.config_path);
  const originalPluginDescriptionFromSource = sourcePluginInfo.description || `Plugin ${sourcePluginId}`;


  let targetBaseDir;
  if (options.targetDir) {
      targetBaseDir = path.resolve(options.targetDir);
  } else {
      targetBaseDir = path.join(path.dirname(this.collRoot), DEFAULT_ARCHETYPE_BASE_DIR_NAME);
  }

  const archetypePath = path.join(targetBaseDir, newArchetypeName);

  if (fss.existsSync(archetypePath)) {
      throw new Error(`Target archetype directory "${archetypePath}" already exists. Please remove it or choose a different name.`);
  }

  try {
      await fs.mkdir(targetBaseDir, { recursive: true });
      await fsExtra.copy(sourcePluginBasePath, archetypePath);
      if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Copied from ${sourcePluginBasePath} to ${archetypePath}`));

      const originalConfigPathInArchetype = path.join(archetypePath, originalSourceConfigFilename);
      const newConfigFilename = `${newArchetypeName}.config.yaml`;
      const newConfigPathInArchetype = path.join(archetypePath, newConfigFilename);
      let messages = [];
      
      const sourcePluginIdPascal = toPascalCase(sourcePluginId);
      const newArchetypeNamePascal = toPascalCase(newArchetypeName);
      const filesToProcessForStringReplacement = [];
      const processExtensions = ['.js', '.yaml', '.yml', '.css', '.md'];

      if (fss.existsSync(originalConfigPathInArchetype)) {
          if (originalConfigPathInArchetype !== newConfigPathInArchetype) {
            await fs.rename(originalConfigPathInArchetype, newConfigPathInArchetype);
            messages.push(`Renamed config file to ${newConfigFilename}.`);
          } else {
            messages.push(`Config file already named ${newConfigFilename}.`);
          }
          
          if (processExtensions.includes(path.extname(newConfigFilename).toLowerCase())) {
            filesToProcessForStringReplacement.push(newConfigPathInArchetype);
          }

          let configData = yaml.load(await fs.readFile(newConfigPathInArchetype, 'utf8'));
          configData.description = `Archetype of ${sourcePluginId}: ${originalPluginDescriptionFromSource}`.trim();
          messages.push(`Updated description in ${newConfigFilename} to correctly reference original source.`);

          // Handle CSS file renaming and update in config (Revised Logic)
          if (configData.css_files && Array.isArray(configData.css_files) && configData.css_files.length > 0) {
            const conventionalCssToRename = `${sourcePluginId}.css`;
            const cssIndex = configData.css_files.indexOf(conventionalCssToRename);

            if (cssIndex !== -1) { // Only rename if a conventionally named CSS file is found
              const oldCssPathInArchetype = path.join(archetypePath, conventionalCssToRename);
              const newCssName = `${newArchetypeName}.css`;
              
              if (fss.existsSync(oldCssPathInArchetype)) {
                if (path.join(archetypePath, conventionalCssToRename) !== path.join(archetypePath, newCssName)) {
                    await fs.rename(oldCssPathInArchetype, path.join(archetypePath, newCssName));
                    messages.push(`Renamed CSS file ${conventionalCssToRename} to ${newCssName}.`);
                }
                configData.css_files[cssIndex] = newCssName; // Update the reference in the config
                messages.push(`Updated CSS file reference in ${newConfigFilename} to ${newCssName}.`);
                if (processExtensions.includes(path.extname(newCssName).toLowerCase()) && !filesToProcessForStringReplacement.includes(path.join(archetypePath,newCssName))) {
                    filesToProcessForStringReplacement.push(path.join(archetypePath,newCssName));
                }
              } else {
                messages.push(`Conventional CSS file ${conventionalCssToRename} referenced in config but not found in archetype, reference not updated.`);
              }
            } else {
              messages.push(`No conventional CSS file ('${sourcePluginId}.css') found in css_files array; CSS files and their references in config remain as-is.`);
            }
          }

          const conventionalOldHandlerName = `${sourcePluginId}.js`;
          if (configData.handler_script && configData.handler_script === conventionalOldHandlerName && conventionalOldHandlerName !== 'index.js') {
            const oldHandlerPathInArchetype = path.join(archetypePath, conventionalOldHandlerName);
            const newHandlerName = `${newArchetypeName}.js`;
            if (fss.existsSync(oldHandlerPathInArchetype)) {
                await fs.rename(oldHandlerPathInArchetype, path.join(archetypePath, newHandlerName));
                messages.push(`Renamed handler script ${conventionalOldHandlerName} to ${newHandlerName}.`);
              configData.handler_script = newHandlerName;
              messages.push(`Updated handler_script in ${newConfigFilename} to ${newHandlerName}.`);
              if (processExtensions.includes(path.extname(newHandlerName).toLowerCase()) && !filesToProcessForStringReplacement.includes(path.join(archetypePath,newHandlerName))) {
                filesToProcessForStringReplacement.push(path.join(archetypePath,newHandlerName));
              }
            } else {
              messages.push(`Conventional handler script ${conventionalOldHandlerName} not found in archetype, reference not updated.`);
            }
          }
          await fs.writeFile(newConfigPathInArchetype, yaml.dump(configData));
          if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin): Saved updated config fields in ${newConfigFilename} (pre-string-replacement of its content).`));

      } else {
          messages.push(`Original config file ${originalSourceConfigFilename} not found in copied archetype at ${archetypePath}. Cannot rename or modify.`);
          console.warn(chalk.yellow(`WARN (CM:archetypePlugin): ${messages[messages.length-1]}`));
      }
      
      const dirents = await fs.readdir(archetypePath, { withFileTypes: true });
      for (const dirent of dirents) {
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
            if (this.debug) console.log(chalk.magenta(`DEBUG (CM:archetypePlugin SR): File ${path.basename(filePath)} not found for string replacement (may have been renamed).`));
            continue;
          }
          try {
            let fileContent = await fs.readFile(filePath, 'utf8');
            let originalFileContentForCompare = fileContent;
            let currentFileMessages = [];

            if (sourcePluginId !== newArchetypeName) {
                const regexId = new RegExp(sourcePluginId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                fileContent = fileContent.replace(regexId, newArchetypeName);
            }

            if (sourcePluginIdPascal && newArchetypeNamePascal && sourcePluginIdPascal !== newArchetypeNamePascal) {
              const regexPascal = new RegExp(sourcePluginIdPascal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              fileContent = fileContent.replace(regexPascal, newArchetypeNamePascal);
            }
            
            if (fileContent !== originalFileContentForCompare) {
              if (filePath === newConfigPathInArchetype) {
                let tempConfigData = yaml.load(fileContent);
                // Ensure the specific description line is NOT affected by sourcePluginId -> newArchetypeName replacement
                tempConfigData.description = `Archetype of ${sourcePluginId}: ${originalPluginDescriptionFromSource}`.trim();
                fileContent = yaml.dump(tempConfigData);
                currentFileMessages.push(`Re-applied original source to description in ${path.basename(filePath)} after string replacement.`);
              }
              await fs.writeFile(filePath, fileContent);
              currentFileMessages.push(`Performed string replacements in ${path.basename(filePath)}.`);
              replacementOccurredInAnyFile = true;
            }
            if (currentFileMessages.length > 0 && this.debug){
                console.log(chalk.magenta(`DEBUG (CM:archetypePlugin SR): ${currentFileMessages.join(' ')}`));
            }

          } catch (srError) {
            messages.push(`Error processing content in ${path.basename(filePath)}: ${srError.message.substring(0,30)}...`);
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
              const archetypeNote = `\n**Note:** This is an archetype of the "${sourceCollectionName}/${sourcePluginId}" plugin, created as "${newArchetypeName}". You may need to update its content, registration paths, and internal references if you customize it further.\n`;
              let newReadmeContent = '';
              const cleanMainReadmeContent = mainReadmeContent.replace(archetypeNote, ''); // Avoid duplicating the note

              if (Object.keys(fmData).length > 0) {
                  newReadmeContent = `---\n${yaml.dump(fmData)}---\n${cleanMainReadmeContent}${archetypeNote}`; 
              } else {
                  newReadmeContent = `${cleanMainReadmeContent}${archetypeNote}`; 
              }
              await fs.writeFile(readmePath, newReadmeContent);
              messages.push("Updated README.md with an archetype note.");
          } catch(readmeError) {
              messages.push(`Failed to update README.md: ${readmeError.message}`);
          }
      }

      const conventionalExampleMd = `${sourcePluginId}-example.md`;
      const oldExampleMdPath = path.join(archetypePath, conventionalExampleMd);
      const newExampleMdName = `${newArchetypeName}-example.md`;
      const newExampleMdPath = path.join(archetypePath, newExampleMdName);

      if (fss.existsSync(oldExampleMdPath)) {
          if (oldExampleMdPath !== newExampleMdPath) {
            await fs.rename(oldExampleMdPath, newExampleMdPath);
            messages.push(`Renamed example Markdown file ${conventionalExampleMd} to ${newExampleMdName}.`);
          }
      } else {
          const alternativeExampleMd = `${sourcePluginId}_example.md`;
          const oldAlternativeExampleMdPath = path.join(archetypePath, alternativeExampleMd);
          if (fss.existsSync(oldAlternativeExampleMdPath)) {
              if (oldAlternativeExampleMdPath !== newExampleMdPath) {
                await fs.rename(oldAlternativeExampleMdPath, newExampleMdPath);
                messages.push(`Renamed example Markdown file ${alternativeExampleMd} to ${newExampleMdName}.`);
              }
          }
      }

      const successMessage = `Archetype '${newArchetypeName}' created successfully from '${sourcePluginIdentifier}'. Operations: ${messages.join(' ')}`;
      console.log(chalk.green(successMessage));
      return { success: true, message: successMessage, archetypePath: archetypePath };

  } catch (error) {
      console.error(chalk.red(`ERROR (CM:archetypePlugin): Failed during archetype creation for '${newArchetypeName}': ${error.message}`));
      if (this.debug && error.stack) console.error(chalk.red(error.stack));
      
      if (fss.existsSync(archetypePath)) {
          try {
              await fsExtra.rm(archetypePath, { recursive: true, force: true });
              console.log(chalk.yellow(`  INFO (CM:archetypePlugin): Cleaned up partially created archetype directory: ${archetypePath}`));
          } catch (cleanupError) {
              console.error(chalk.red(`  ERROR (CM:archetypePlugin): Failed to cleanup partially created archetype directory ${archetypePath}: ${cleanupError.message}`));
          }
      }
      throw error; 
  }
};
