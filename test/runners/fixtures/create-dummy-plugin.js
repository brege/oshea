// test/runners/fixtures/create-dummy-plugin.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const fs = require('fs-extra');
const path = require('node:path');
const yaml = require('js-yaml');
const logger = require(loggerPath);

const PLUGIN_CONFIG_FILENAME = 'default.yaml';
const PLUGIN_EXAMPLE_FILENAME = 'example.md';
const PLUGIN_STYLE_FILENAME = 'style.css';

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

  // Normalize config file name and update plugin_name metadata.
  const originalConfigPath = path.join(pluginDir, PLUGIN_CONFIG_FILENAME);
  const targetConfigPath = path.join(pluginDir, PLUGIN_CONFIG_FILENAME);

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

  // Normalize example file name.
  const originalExamplePath = path.join(pluginDir, PLUGIN_EXAMPLE_FILENAME);
  const targetExamplePath = path.join(pluginDir, PLUGIN_EXAMPLE_FILENAME);

  if (
    (await fs.pathExists(originalExamplePath)) &&
    originalExamplePath !== targetExamplePath
  ) {
    await fs.move(originalExamplePath, targetExamplePath);
  }

  // Normalize style file name.
  const originalCssPath = path.join(pluginDir, PLUGIN_STYLE_FILENAME);
  const targetCssPath = path.join(pluginDir, PLUGIN_STYLE_FILENAME);

  if (
    (await fs.pathExists(originalCssPath)) &&
    originalCssPath !== targetCssPath
  ) {
    await fs.move(originalCssPath, targetCssPath);

    // Update CSS reference in config file.
    const configContent = yaml.load(
      await fs.readFile(targetConfigPath, 'utf8'),
    );
    if (configContent.css_files) {
      configContent.css_files = configContent.css_files.map((file) =>
        file === `${originalPluginName}.css` ? PLUGIN_STYLE_FILENAME : file,
      );
      await fs.writeFile(targetConfigPath, yaml.dump(configContent));
    }
  }

  // Apply breakages
  for (const breakageType of breakage) {
    await applyBreakage(pluginDir, pluginName, breakageType);
  }

  return pluginDir;
}

// Apply specific breakage to a plugin
async function applyBreakage(pluginDir, pluginName, breakageType) {
  const configPath = path.join(pluginDir, PLUGIN_CONFIG_FILENAME);
  const newConfigPath = path.join(pluginDir, PLUGIN_CONFIG_FILENAME);

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

async function breakPluginName(configPath, newConfigPath, _pluginName) {
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
    path.join(pluginDir, PLUGIN_CONFIG_FILENAME),
    `description: ${pluginName}`,
  );
  await fs.writeFile(path.join(pluginDir, 'README.md'), `# ${pluginName}`);
  await fs.writeFile(
    path.join(pluginDir, PLUGIN_EXAMPLE_FILENAME),
    '# Example',
  );
  await fs.writeFile(path.join(pluginDir, PLUGIN_STYLE_FILENAME), 'body {}');
}

function getOriginalPluginName(baseFixture) {
  return baseFixture;
}

async function findConfigFile(pluginDir) {
  return path.join(pluginDir, PLUGIN_CONFIG_FILENAME);
}

async function findExampleFile(pluginDir) {
  const examplePath = path.join(pluginDir, PLUGIN_EXAMPLE_FILENAME);
  return (await fs.pathExists(examplePath)) ? examplePath : null;
}

module.exports = {
  createDummyPlugin,
};
