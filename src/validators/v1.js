// src/validators/v1.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const os = require('os');
const { projectRoot, cliPath, mochaPath, nodeModulesPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

/**
 * Helper function to check README.md front matter for v1 protocol.
 * @param {string} readmePath - Path to the README.md file.
 * @param {string} pluginName - The name of the plugin.
 * @param {Array<string>} warnings - Array to push warnings into.
 */
function checkReadmeFrontMatterV1(readmePath, pluginName, warnings) {
  logger.info('  Checking README.md front matter...', { module: 'src/validators/v1.js' });
  if (!fs.existsSync(readmePath)) {
    return;
  }
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const frontMatterDelimiter = '---';
  const parts = readmeContent.split(frontMatterDelimiter);
  if (parts.length < 3 || parts[0].trim() !== '') {
    warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
    logger.warn('    [!] README.md does not have a valid YAML front matter block.', { module: 'src/validators/v1.js' });
    return;
  }
  try {
    const frontMatter = yaml.load(parts[1]);
    if (!frontMatter || typeof frontMatter !== 'object') {
      warnings.push(`README.md for '${pluginName}' has invalid front matter.`);
      logger.warn('    [!] README.md has invalid front matter.', { module: 'src/validators/v1.js' });
      return;
    }
    logger.success('    [✔] README.md has a valid front matter block.', { module: 'src/validators/v1.js' });
  } catch (e) {
    warnings.push(`Could not parse README.md front matter for '${pluginName}': ${e.message}.`);
    logger.warn('    [!] Could not parse README.md front matter.', { module: 'src/validators/v1.js' });
  }
}

/**
 * Checks for the presence of required plugin files and directories.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being checked.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const checkFileStructure = (pluginDirectoryPath, pluginName, errors, warnings) => {
  logger.info('  Checking plugin file structure...', { module: 'src/validators/v1.js' });
  const requiredFiles = ['index.js', `${pluginName}.config.yaml`, `${pluginName}-example.md`, 'README.md'];
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(pluginDirectoryPath, file))) {
      logger.success(`    [✔] Found required file: '${file}'`, { module: 'src/validators/v1.js' });
    } else {
      errors.push(`Missing required file: '${file}'.`);
      logger.error(`    [✖] Missing required file: '${file}'`, { module: 'src/validators/v1.js' });
    }
  }
  logger.info('  Checking for optional files...', { module: 'src/validators/v1.js' });
  const contractDir = path.join(pluginDirectoryPath, '.contract');
  const testDir = path.join(contractDir, 'test');
  if (fs.existsSync(testDir)) {
    logger.success('    [✔] Found optional \'.contract/test/\' directory.', { module: 'src/validators/v1.js' });
  } else {
    warnings.push('Missing optional \'.contract/test/\' directory.');
    logger.warn('    [!] Missing optional \'.contract/test/\' directory.', { module: 'src/validators/v1.js' });
  }
  const schemaFileName = `${pluginName}.schema.json`;
  const schemaPath = path.join(contractDir, schemaFileName);
  if (fs.existsSync(schemaPath)) {
    logger.success(`    [✔] Plugin has a schema file ('${schemaFileName}').`, { module: 'src/validators/v1.js' });
  } else {
    warnings.push(`Missing optional schema file ('${schemaFileName}') in .contract/ directory.`);
    logger.warn('    [!] Plugin does not have a specific schema file in .contract/ directory.', { module: 'src/validators/v1.js' });
  }
};

/**
 * Runs the co-located E2E test file for a given plugin.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being tested.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const runInSituTest = (pluginDirectoryPath, pluginName, errors, warnings) => {
  logger.info('  Checking plugin\'s test setup...', { module: 'src/validators/v1.js' });
  const e2eTestPath = path.join(pluginDirectoryPath, '.contract', 'test', `${pluginName}-e2e.test.js`);
  if (!fs.existsSync(e2eTestPath)) {
    warnings.push(`Missing E2E test file, skipping test run: '${path.join('.contract/test', `${pluginName}-e2e.test.js`)}'.`);
    logger.warn('    [!] Missing E2E test file, skipping run.', { module: 'src/validators/v1.js' });
    return;
  }
  logger.success(`    [✔] Found E2E test file: '${path.basename(e2eTestPath)}'`, { module: 'src/validators/v1.js' });
  try {
    logger.info('    Running in-situ E2E test...', { module: 'src/validators/v1.js' });
    const command = `node "${mochaPath}" "${e2eTestPath}" --no-config --no-opts`;
    execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env, // Inherit existing environment variables
        NODE_PATH: nodeModulesPath
      }
    });
    logger.success('    [✔] In-situ test passes.', { module: 'src/validators/v1.js' });
  } catch (e) {
    errors.push('In-situ E2E test failed');
    logger.error('    [✖] In-situ test failed.', { module: 'src/validators/v1.js' });
    logger.error('\n--- Begin In-Situ Test Error Output ---', { module: 'src/validators/v1.js' });
    if (e.stderr) {
      logger.error(e.stderr.toString(), { module: 'src/validators/v1.js' });
    } else {
      logger.error('No STDERR captured. Full error object:', { module: 'src/validators/v1.js', error: e });
    }
    logger.error('--- End In-Situ Test Error Output ---\n', { module: 'src/validators/v1.js' });
  }
};

/**
 * Performs a self-activation sanity check by attempting to run the plugin's example.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being checked.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const runSelfActivation = (pluginDirectoryPath, pluginName, errors) => {
  logger.info('  Performing self-activation sanity check...', { module: 'src/validators/v1.js' });
  const exampleMdPath = path.join(pluginDirectoryPath, `${pluginName}-example.md`);
  const configYamlPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
  if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
    errors.push('Self-activation failed: The plugin is missing its example.md or config.yaml file.');
    logger.error('    [✖] Self-activation check failed (missing example/config).', { module: 'src/validators/v1.js' });
    return;
  }
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `md-to-pdf-test-${pluginName}-`));
  try {
    const command = `node "${cliPath}" convert "${exampleMdPath}" --outdir "${tempOutputDir}" --no-open`;
    execSync(command, { cwd: projectRoot, stdio: 'pipe' });
    logger.success('    [✔] Self-activation successful.', { module: 'src/validators/v1.js' });
  } catch {
    errors.push('Self-activation failed: The plugin was unable to convert its own example file.');
    logger.error('    [✖] Self-activation check failed.', { module: 'src/validators/v1.js' });
  } finally {
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
  }
};

/**
 * Validates a plugin based on the v1 contract.
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @param {object} pluginMetadata - Pre-resolved metadata for the plugin.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - The complete validation result.
 */
function validateV1(pluginDirectoryPath, pluginMetadata) {
  const errors = [];
  const warnings = [];
  const pluginName = pluginMetadata.plugin_name.value;
  checkFileStructure(pluginDirectoryPath, pluginName, errors, warnings);
  runInSituTest(pluginDirectoryPath, pluginName, errors, warnings);
  const readmePath = path.join(pluginDirectoryPath, 'README.md');
  checkReadmeFrontMatterV1(readmePath, pluginName, warnings);
  if (errors.length === 0) {
    runSelfActivation(pluginDirectoryPath, pluginName, errors, warnings);
  } else {
    warnings.push('Skipping self-activation check due to prior critical errors.');
    logger.warn('    [!] Skipping self-activation check due to prior errors.', { module: 'src/validators/v1.js' });
  }
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

module.exports = {
  validateV1,
  checkFileStructure,
  runInSituTest,
  runSelfActivation,
  checkReadmeFrontMatterV1
};
