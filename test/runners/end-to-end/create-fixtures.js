// test/runners/end-to-end/create-fixtures.js
require('module-alias/register');
const { loggerPath, projectRoot, testRoot, fixturesDir } = require('@paths');
const fs = require('fs-extra');
const path = require('node:path');
const yaml = require('js-yaml');
const { execSync } = require('node:child_process');
const logger = require(loggerPath);

const DEFAULT_MANIFEST_PATH = path.join(testRoot, 'config', 'fixtures.yaml');
const FIXTURES_ROOT = fixturesDir;

function loadManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = yaml.load(content);
  if (!manifest || typeof manifest !== 'object' || !manifest.groups) {
    throw new Error(`Invalid fixture manifest: ${manifestPath}`);
  }
  return manifest;
}

function getGroup(manifest, groupName) {
  const group = manifest.groups[groupName];
  if (!group || !Array.isArray(group.files)) {
    throw new Error(`Missing fixture group: ${groupName}`);
  }
  return group;
}

async function writeFileFromEntry(entry, targetPath) {
  await fs.ensureDir(path.dirname(targetPath));
  if (entry.copy_from) {
    await fs.copy(entry.copy_from, targetPath);
    return;
  }
  await fs.writeFile(targetPath, entry.content ?? '', 'utf8');
}

async function materializeGroup(groupName, outputRoot, options = {}) {
  const { clean = false, manifestPath = DEFAULT_MANIFEST_PATH } = options;
  const manifest = loadManifest(manifestPath);
  const group = getGroup(manifest, groupName);

  if (clean) {
    await fs.remove(outputRoot);
  }
  await fs.ensureDir(outputRoot);

  for (const entry of group.files) {
    const targetPath = path.join(outputRoot, entry.path);
    await writeFileFromEntry(entry, targetPath);
  }
}

async function materializeSubtree(
  groupName,
  sourcePrefix,
  outputRoot,
  options = {},
) {
  const { clean = false, manifestPath = DEFAULT_MANIFEST_PATH } = options;
  const manifest = loadManifest(manifestPath);
  const group = getGroup(manifest, groupName);
  const prefix = sourcePrefix.endsWith('/') ? sourcePrefix : `${sourcePrefix}/`;

  if (clean) {
    await fs.remove(outputRoot);
  }
  await fs.ensureDir(outputRoot);

  for (const entry of group.files) {
    if (!entry.path.startsWith(prefix)) {
      continue;
    }
    const relativePath = entry.path.slice(prefix.length);
    const targetPath = path.join(outputRoot, relativePath);
    await writeFileFromEntry(entry, targetPath);
  }
}

async function setPluginName(pluginDir, pluginName) {
  const configPath = path.join(pluginDir, 'default.yaml');
  const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
  config.plugin_name = pluginName;
  await fs.writeFile(configPath, yaml.dump(config));
}

async function createDummyPlugin(pluginName, options = {}) {
  const {
    breakage = [],
    baseFixture = 'valid-plugin',
    destinationDir,
  } = options;
  if (!destinationDir) {
    throw new Error('destinationDir is required');
  }

  const pluginDir = path.join(destinationDir, pluginName);
  await fs.ensureDir(destinationDir);
  await materializeSubtree(
    'valid_plugin',
    `full-fat-dummies/${baseFixture}`,
    pluginDir,
    { clean: true },
  );
  await setPluginName(pluginDir, pluginName);

  for (const breakageType of breakage) {
    await applyBreakage(pluginDir, pluginName, breakageType);
  }

  return pluginDir;
}

async function applyBreakage(pluginDir, pluginName, breakageType) {
  const configPath = path.join(pluginDir, 'default.yaml');

  if (breakageType === 'unsupported-protocol') {
    const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
    config.plugin_name = pluginName;
    config.protocol = 'v0.5';
    await fs.writeFile(configPath, yaml.dump(config));
    return;
  }

  if (breakageType === 'missing-yaml') {
    await fs.remove(configPath);
    return;
  }

  if (breakageType === 'missing-handler') {
    await fs.remove(path.join(pluginDir, 'index.js'));
    return;
  }

  if (breakageType === 'missing-plugin-name') {
    const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
    delete config.plugin_name;
    await fs.writeFile(configPath, yaml.dump(config));
    return;
  }

  if (breakageType === 'missing-version') {
    const config = yaml.load(await fs.readFile(configPath, 'utf8')) || {};
    config.plugin_name = pluginName;
    delete config.version;
    await fs.writeFile(configPath, yaml.dump(config));
    return;
  }

  if (breakageType === 'missing-example') {
    await fs.remove(path.join(pluginDir, 'example.md'));
    return;
  }

  if (breakageType === 'missing-readme') {
    await fs.remove(path.join(pluginDir, 'README.md'));
    return;
  }

  logger.warn(`Unknown breakage type: ${breakageType}`, {
    context: 'FixtureBootstrap',
  });
}

async function refreshFixtures() {
  await fs.remove(path.join(FIXTURES_ROOT, 'markdown'));
  await fs.remove(path.join(FIXTURES_ROOT, 'hugo-example'));
  await fs.remove(path.join(FIXTURES_ROOT, 'full-fat-dummies'));

  await materializeGroup('markdown', FIXTURES_ROOT);
  await materializeGroup('hugo_example', FIXTURES_ROOT);
  await materializeGroup('valid_plugin', FIXTURES_ROOT);
}

async function validateFixtures() {
  const validPluginDir = path.join(
    FIXTURES_ROOT,
    'full-fat-dummies',
    'valid-plugin',
  );
  execSync(`node cli.js plugin validate "${validPluginDir}"`, {
    cwd: projectRoot,
    stdio: 'pipe',
  });
}

if (require.main === module) {
  refreshFixtures()
    .then(() => validateFixtures())
    .catch((error) => {
      logger.error('Fixture bootstrap failed', {
        context: 'FixtureBootstrap',
        error: error.message,
      });
      process.exit(1);
    });
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  loadManifest,
  materializeGroup,
  materializeSubtree,
  createDummyPlugin,
  refreshFixtures,
  validateFixtures,
};
