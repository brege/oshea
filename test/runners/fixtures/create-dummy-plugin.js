// test/runners/fixtures/create-dummy-plugin.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const logger = require(loggerPath);

// Intelligent dummy plugin factory that creates test plugins with specific breakages
async function createDummyPlugin(pluginName, options = {}) {
  const {
    breakage = [],
    baseFixture = 'valid-plugin',
    destinationDir,
  } = options;

  if (!destinationDir) {
    throw new Error('destinationDir is required');
  }

  // Source fixture path
  const fixtureRoot = path.join(__dirname, 'full-fat-dummies');
  const sourcePath = path.join(fixtureRoot, baseFixture);

  // Destination path
  const pluginDir = path.join(destinationDir, pluginName);

  // Copy base fixture
  await fs.ensureDir(destinationDir);
  await fs.copy(sourcePath, pluginDir);

  // Always rename files to match plugin name (even with no breakage)
  const originalPluginName = getOriginalPluginName(baseFixture);

  // Rename config file
  const originalConfigPath = path.join(
    pluginDir,
    `${originalPluginName}.config.yaml`,
  );
  const targetConfigPath = path.join(pluginDir, `${pluginName}.config.yaml`);

  if (
    (await fs.pathExists(originalConfigPath)) &&
    originalConfigPath !== targetConfigPath
  ) {
    // Read, update plugin_name, and write to new location
    const config = yaml.load(await fs.readFile(originalConfigPath, 'utf8'));
    config.plugin_name = pluginName;
    await fs.writeFile(targetConfigPath, yaml.dump(config));
    await fs.remove(originalConfigPath);
  }

  // Rename example file
  const originalExamplePath = path.join(
    pluginDir,
    `${originalPluginName}-example.md`,
  );
  const targetExamplePath = path.join(pluginDir, `${pluginName}-example.md`);

  if (
    (await fs.pathExists(originalExamplePath)) &&
    originalExamplePath !== targetExamplePath
  ) {
    await fs.move(originalExamplePath, targetExamplePath);
  }

  // Rename CSS file
  const originalCssPath = path.join(pluginDir, `${originalPluginName}.css`);
  const targetCssPath = path.join(pluginDir, `${pluginName}.css`);

  if (
    (await fs.pathExists(originalCssPath)) &&
    originalCssPath !== targetCssPath
  ) {
    await fs.move(originalCssPath, targetCssPath);

    // Update CSS reference in config file
    const configContent = yaml.load(
      await fs.readFile(targetConfigPath, 'utf8'),
    );
    if (configContent.css_files) {
      configContent.css_files = configContent.css_files.map((file) =>
        file === `${originalPluginName}.css` ? `${pluginName}.css` : file,
      );
      await fs.writeFile(targetConfigPath, yaml.dump(configContent));
    }
  }

  // Apply breakages
  for (const breakageType of breakage) {
    await applyBreakage(pluginDir, pluginName, breakageType, baseFixture);
  }

  return pluginDir;
}

// Apply specific breakage to a plugin
async function applyBreakage(pluginDir, pluginName, breakageType, baseFixture) {
  const configPath = path.join(
    pluginDir,
    `${getOriginalPluginName(baseFixture)}.config.yaml`,
  );
  const newConfigPath = path.join(pluginDir, `${pluginName}.config.yaml`);

  switch (breakageType) {
    case 'unsupported-protocol':
      await breakProtocol(configPath, newConfigPath, pluginName);
      break;

    case 'missing-yaml':
      await fs.remove(await findConfigFile(pluginDir));
      break;

    case 'missing-handler':
      await fs.remove(path.join(pluginDir, 'index.js'));
      break;

    case 'missing-plugin-name':
      await breakPluginName(configPath, newConfigPath, pluginName);
      break;

    case 'missing-version':
      await breakVersion(configPath, newConfigPath, pluginName);
      break;

    case 'minimal-legacy':
      // Creates old-style plugin with just description (for backwards compatibility tests)
      await createMinimalLegacyPlugin(pluginDir, pluginName);
      break;

    case 'missing-example': {
      const exampleFile = await findExampleFile(pluginDir);
      if (exampleFile) await fs.remove(exampleFile);
      break;
    }

    case 'missing-readme':
      await fs.remove(path.join(pluginDir, 'README.md'));
      break;

    default:
      logger.warn(`Unknown breakage type: ${breakageType}`, {
        context: 'createDummyPlugin',
      });
  }
}

async function breakProtocol(configPath, newConfigPath, pluginName) {
  const config = yaml.load(await fs.readFile(configPath, 'utf8'));
  config.plugin_name = pluginName;
  config.protocol = 'v0.5'; // Unsupported protocol

  await fs.writeFile(newConfigPath, yaml.dump(config));
  if (configPath !== newConfigPath) {
    await fs.remove(configPath);
  }
}

async function breakPluginName(configPath, newConfigPath, pluginName) {
  const config = yaml.load(await fs.readFile(configPath, 'utf8'));
  delete config.plugin_name; // Remove required field

  await fs.writeFile(newConfigPath, yaml.dump(config));
  if (configPath !== newConfigPath) {
    await fs.remove(configPath);
  }
}

async function breakVersion(configPath, newConfigPath, pluginName) {
  const config = yaml.load(await fs.readFile(configPath, 'utf8'));
  config.plugin_name = pluginName;
  delete config.version; // Remove required field

  await fs.writeFile(newConfigPath, yaml.dump(config));
  if (configPath !== newConfigPath) {
    await fs.remove(configPath);
  }
}

async function createMinimalLegacyPlugin(pluginDir, pluginName) {
  // Remove all files and create minimal legacy structure
  await fs.emptyDir(pluginDir);

  // Create minimal files
  await fs.writeFile(path.join(pluginDir, 'index.js'), 'module.exports = {};');
  await fs.writeFile(
    path.join(pluginDir, `${pluginName}.config.yaml`),
    `description: ${pluginName}`,
  );
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
  await fs.writeFile(
    path.join(pluginDir, `${pluginName}-example.md`),
    '# Example',
  );
}

function getOriginalPluginName(baseFixture) {
  return baseFixture === 'valid-collection'
    ? 'valid-collection-plugin-1'
    : baseFixture;
}

async function findConfigFile(pluginDir) {
  const files = await fs.readdir(pluginDir);
  return files.find((f) => f.endsWith('.config.yaml'));
}

async function findExampleFile(pluginDir) {
  const files = await fs.readdir(pluginDir);
  const exampleFile = files.find((f) => f.endsWith('-example.md'));
  return exampleFile ? path.join(pluginDir, exampleFile) : null;
}

// Create a collection with multiple plugins, optionally broken
async function createDummyCollection(
  collectionName,
  destinationDir,
  options = {},
) {
  const { pluginBreakages = [] } = options;

  const collectionDir = path.join(destinationDir, collectionName);
  await fs.ensureDir(collectionDir);

  // Copy the valid collection fixture
  const fixtureRoot = path.join(__dirname, 'full-fat-dummies');
  const sourceCollectionPath = path.join(fixtureRoot, 'valid-collection');

  await fs.copy(sourceCollectionPath, collectionDir);

  // Apply any plugin-specific breakages
  for (const pluginBreakage of pluginBreakages) {
    const { pluginName, breakage } = pluginBreakage;
    const pluginDir = path.join(collectionDir, pluginName);

    for (const breakageType of breakage) {
      await applyBreakage(
        pluginDir,
        pluginName,
        breakageType,
        'valid-collection-plugin-1',
      );
    }
  }

  return collectionDir;
}

module.exports = {
  createDummyPlugin,
  createDummyCollection,
};
