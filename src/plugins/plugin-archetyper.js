// src/plugins/plugin-archetyper.js
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

const fs = require('node:fs').promises;
const fss = require('node:fs');
const path = require('node:path');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');

async function createArchetype(
  dependencies,
  managerContext,
  sourcePluginIdentifier,
  newArchetypeName,
  options = {},
) {
  const {
    cmUtils,
    collectionsMetadataFilename,
    collectionsDefaultArchetypeDirname,
  } = dependencies;
  const { collRoot } = managerContext;

  let sourcePluginInfo;
  let sourcePluginIdForReplacement = '';

  const resolvedSourcePath = path.resolve(sourcePluginIdentifier);
  if (
    !fss.existsSync(resolvedSourcePath) ||
    !fss.lstatSync(resolvedSourcePath).isDirectory()
  ) {
    throw new Error(
      `Source plugin path "${resolvedSourcePath}" not found or is not a directory.`,
    );
  }
  sourcePluginIdForReplacement = path.basename(resolvedSourcePath);
  const configFileName = [
    `${sourcePluginIdForReplacement}.config.yaml`,
    `${sourcePluginIdForReplacement}.yaml`,
  ].find((cfg) => fss.existsSync(path.join(resolvedSourcePath, cfg)));
  if (!configFileName) {
    throw new Error(
      `Config file (.config.yaml or .yaml) not found in source plugin directory "${resolvedSourcePath}".`,
    );
  }
  sourcePluginInfo = {
    collection: '[direct path source]',
    plugin_id: sourcePluginIdForReplacement,
    base_path: resolvedSourcePath,
    config_path: path.join(resolvedSourcePath, configFileName),
  };
  try {
    const sourceConfigContent = await fs.readFile(
      sourcePluginInfo.config_path,
      'utf8',
    );
    sourcePluginInfo.description =
      yaml.load(sourceConfigContent).description ||
      `Plugin from path: ${sourcePluginIdForReplacement}`;
  } catch {
    logger.warn('Could not read description from direct path source config.', {
      context: 'PluginArchetyper',
      configPath: sourcePluginInfo.config_path,
      suggestion: 'Ensure the config file is a valid YAML format.',
    });
  }

  const sourcePluginBasePath = sourcePluginInfo.base_path;
  const originalSourceConfigFilename = path.basename(
    sourcePluginInfo.config_path,
  );
  const originalPluginDescriptionFromSource =
    sourcePluginInfo.description || `Plugin ${sourcePluginIdForReplacement}`;

  const targetBaseDir = options.targetDir
    ? path.resolve(options.targetDir)
    : path.join(collRoot, collectionsDefaultArchetypeDirname);
  const archetypePath = path.join(targetBaseDir, newArchetypeName);

  if (fss.existsSync(archetypePath) && !options.force) {
    throw new Error(
      `Target archetype directory "${archetypePath}" already exists. Use --force to overwrite.`,
    );
  }
  if (fss.existsSync(archetypePath) && options.force) {
    await fsExtra.rm(archetypePath, { recursive: true, force: true });
  }

  await fs.mkdir(targetBaseDir, { recursive: true });
  await fsExtra.copy(sourcePluginBasePath, archetypePath, {
    filter: (src) => !src.includes(collectionsMetadataFilename),
  });

  const sourcePluginIdPascal = cmUtils.toPascalCase(
    sourcePluginIdForReplacement,
  );
  const newArchetypeNamePascal = cmUtils.toPascalCase(newArchetypeName);
  const filesToProcessForStringReplacement = [];
  const processExtensions = ['.js', '.yaml', '.yml', '.css', '.md', '.json'];

  const newConfigFilename = `${newArchetypeName}.config.yaml`;
  const newConfigPathInArchetype = path.join(archetypePath, newConfigFilename);
  const originalConfigPathInArchetype = path.join(
    archetypePath,
    originalSourceConfigFilename,
  );
  if (fss.existsSync(originalConfigPathInArchetype)) {
    if (
      originalConfigPathInArchetype.toLowerCase() !==
      newConfigPathInArchetype.toLowerCase()
    ) {
      await fs.rename(originalConfigPathInArchetype, newConfigPathInArchetype);
    }
    filesToProcessForStringReplacement.push(newConfigPathInArchetype);
    const tempConfigData = yaml.load(
      await fs.readFile(newConfigPathInArchetype, 'utf8'),
    );
    tempConfigData.description =
      `Archetype of "${sourcePluginIdentifier}": ${originalPluginDescriptionFromSource}`.trim();

    if (tempConfigData.css_files && Array.isArray(tempConfigData.css_files)) {
      tempConfigData.css_files = tempConfigData.css_files.map((cssFile) => {
        if (
          typeof cssFile === 'string' &&
          cssFile.includes(sourcePluginIdForReplacement)
        ) {
          const oldCssPathInArchetype = path.join(archetypePath, cssFile);
          const newCssName = cssFile.replace(
            new RegExp(
              sourcePluginIdForReplacement.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
              ),
              'g',
            ),
            newArchetypeName,
          );
          if (fss.existsSync(oldCssPathInArchetype)) {
            fss.renameSync(
              oldCssPathInArchetype,
              path.join(archetypePath, newCssName),
            );
            filesToProcessForStringReplacement.push(
              path.join(archetypePath, newCssName),
            );
          }
          return newCssName;
        }
        return cssFile;
      });
    }

    if (
      tempConfigData.handler_script &&
      fss.existsSync(path.join(archetypePath, tempConfigData.handler_script))
    ) {
      filesToProcessForStringReplacement.push(
        path.join(archetypePath, tempConfigData.handler_script),
      );
    }
    await fs.writeFile(newConfigPathInArchetype, yaml.dump(tempConfigData));

    // Don't process config file again in global replacement since we've already handled CSS files
    const configFileIndex = filesToProcessForStringReplacement.indexOf(
      newConfigPathInArchetype,
    );
    if (configFileIndex > -1) {
      filesToProcessForStringReplacement.splice(configFileIndex, 1);
    }
  }

  const contractDirInArchetype = path.join(archetypePath, '.contract');
  if (fss.existsSync(contractDirInArchetype)) {
    const oldSchemaName = `${sourcePluginIdForReplacement}.schema.json`;
    const oldSchemaPath = path.join(contractDirInArchetype, oldSchemaName);
    if (fss.existsSync(oldSchemaPath)) {
      const newSchemaPath = path.join(
        contractDirInArchetype,
        `${newArchetypeName}.schema.json`,
      );
      await fs.rename(oldSchemaPath, newSchemaPath);
      filesToProcessForStringReplacement.push(newSchemaPath);
    }
    const testDirInArchetype = path.join(contractDirInArchetype, 'test');
    if (fss.existsSync(testDirInArchetype)) {
      const oldTestName = `${sourcePluginIdForReplacement}-e2e.test.js`;
      const oldTestPath = path.join(testDirInArchetype, oldTestName);
      if (fss.existsSync(oldTestPath)) {
        const newTestPath = path.join(
          testDirInArchetype,
          `${newArchetypeName}-e2e.test.js`,
        );
        await fs.rename(oldTestPath, newTestPath);
        filesToProcessForStringReplacement.push(newTestPath);
      }
    }
  }

  const currentArchetypeFiles = await fs.readdir(archetypePath, {
    withFileTypes: true,
  });
  for (const dirent of currentArchetypeFiles) {
    const fullFilePath = path.join(archetypePath, dirent.name);
    if (
      dirent.isFile() &&
      processExtensions.includes(path.extname(dirent.name).toLowerCase())
    ) {
      // Skip config file - already processed above
      if (fullFilePath !== newConfigPathInArchetype) {
        filesToProcessForStringReplacement.push(fullFilePath);
      }
    }
  }

  for (const filePath of [...new Set(filesToProcessForStringReplacement)]) {
    if (!fss.existsSync(filePath)) continue;
    let fileContent = await fs.readFile(filePath, 'utf8');
    if (
      sourcePluginIdForReplacement &&
      sourcePluginIdForReplacement !== newArchetypeName
    ) {
      fileContent = fileContent.replace(
        new RegExp(
          sourcePluginIdForReplacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'g',
        ),
        newArchetypeName,
      );
    }
    if (
      sourcePluginIdPascal &&
      newArchetypeNamePascal &&
      sourcePluginIdPascal !== newArchetypeNamePascal
    ) {
      fileContent = fileContent.replace(
        new RegExp(
          sourcePluginIdPascal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'g',
        ),
        newArchetypeNamePascal,
      );
    }
    await fs.writeFile(filePath, fileContent);
  }

  const readmePath = path.join(archetypePath, 'README.md');
  if (fss.existsSync(readmePath)) {
    const originalReadmeContent = await fs.readFile(readmePath, 'utf8');
    const { data: fmData, content: mainReadmeContent } = matter(
      originalReadmeContent,
    );
    const archetypeNotePattern =
      /\n\*\*Note:\*\* This is an archetype of the '[^']+' plugin, created as '[^']+'\..*?\n/gs;
    const cleanMainReadmeContent = mainReadmeContent.replace(
      archetypeNotePattern,
      '',
    );
    const archetypeNote = `\n**Note:** This is an archetype of the '${sourcePluginIdentifier}' plugin, created as '${newArchetypeName}'. You may need to update its content, registration paths, and internal references if you customize it further.\n`;
    let newReadmeContent =
      Object.keys(fmData).length > 0 ? `---\n${yaml.dump(fmData)}---\n` : '';
    newReadmeContent += `${cleanMainReadmeContent}${archetypeNote}`;
    await fs.writeFile(readmePath, newReadmeContent);
  }

  const exampleMdPattern = new RegExp(
    `^${sourcePluginIdForReplacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([-_])example\\.md$`,
    'i',
  );
  const newExampleMdName = `${newArchetypeName}-example.md`;
  const finalListOfFiles = await fs.readdir(archetypePath);
  for (const fileName of finalListOfFiles) {
    if (exampleMdPattern.test(fileName)) {
      await fs.rename(
        path.join(archetypePath, fileName),
        path.join(archetypePath, newExampleMdName),
      );
      break;
    }
  }

  // Add to unified plugins manifest if using default location
  if (!options.targetDir) {
    await addToUserPluginsManifest(
      targetBaseDir,
      newArchetypeName,
      sourcePluginIdentifier,
    );
  }

  // Create source metadata for the plugin
  const sourceMetadata = {
    source_type: 'created',
    created_from: sourcePluginIdentifier,
    archetype_source: 'plugin',
    created_on: new Date().toISOString(),
  };

  const sourceMetadataPath = path.join(archetypePath, '.source.yaml');
  await fs.writeFile(sourceMetadataPath, yaml.dump(sourceMetadata));

  logger.success('Archetype created successfully.', {
    context: 'PluginArchetyper',
    archetypeName: newArchetypeName,
    sourcePlugin: sourcePluginIdentifier,
    result: archetypePath,
  });
  return {
    success: true,
    message: `Archetype '${newArchetypeName}' created successfully.`,
    archetypePath,
  };
}

// Helper function to add created plugin to unified manifest
async function addToUserPluginsManifest(
  userPluginsDir,
  pluginName,
  sourceIdentifier,
) {
  const pluginsManifestPath = path.join(userPluginsDir, 'plugins.yaml');

  let pluginStates = {};

  // Read existing manifest if it exists
  if (fss.existsSync(pluginsManifestPath)) {
    try {
      const content = await fs.readFile(pluginsManifestPath, 'utf8');
      const parsed = yaml.load(content);
      pluginStates = parsed?.plugins || {};
    } catch (e) {
      logger.warn('Could not read existing plugins manifest', {
        context: 'PluginArchetyper',
        path: pluginsManifestPath,
        error: e.message,
      });
    }
  }

  // Add the new plugin
  pluginStates[pluginName] = {
    type: 'created',
    enabled: true,
    created_from: sourceIdentifier,
    created_on: new Date().toISOString(),
  };

  // Write updated manifest
  const updatedManifest = {
    version: '1.0',
    plugins: pluginStates,
  };

  await fs.writeFile(pluginsManifestPath, yaml.dump(updatedManifest));

  logger.debug('Added plugin to unified manifest', {
    context: 'PluginArchetyper',
    pluginName: pluginName,
    manifestPath: pluginsManifestPath,
  });
}

module.exports = {
  createArchetype,
};
