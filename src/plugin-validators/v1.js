// dev/src/plugin-validators/v1.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const yaml =require('js-yaml');
const os = require('os');

/**
 * Helper function to check README.md front matter for v1 protocol.
 * This is not exported as part of the public v1 contract but used internally.
 * @param {string} readmePath - Path to the README.md file.
 * @param {string} pluginName - The name of the plugin.
 * @param {Array<string>} warnings - Array to push warnings into.
 */
function checkReadmeFrontMatterV1(readmePath, pluginName, warnings) {
    console.log(chalk.cyan(`  Checking README.md front matter...`));
    if (!fs.existsSync(readmePath)) {
        // This case is already handled by checkFileStructure, so no need to log here.
        return;
    }

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const frontMatterDelimiter = '---';
    const parts = readmeContent.split(frontMatterDelimiter);

    if (parts.length < 3 || parts[0].trim() !== '') {
        warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
        console.log(chalk.yellow(`    [!] README.md does not have a valid YAML front matter block.`));
        return;
    }

    try {
        const frontMatter = yaml.load(parts[1]);
        if (!frontMatter || typeof frontMatter !== 'object') {
            warnings.push(`README.md for '${pluginName}' has invalid front matter.`);
            console.log(chalk.yellow(`    [!] README.md has invalid front matter.`));
            return;
        }
        // Log that front matter was found and is being checked
        console.log(chalk.green(`    [✔] README.md has a valid front matter block.`));

    } catch (e) {
        warnings.push(`Could not parse README.md front matter for '${pluginName}': ${e.message}.`);
        console.log(chalk.yellow(`    [!] Could not parse README.md front matter.`));
    }
}


/**
 * Checks for the presence of required plugin files and directories.
 * This is a granular check intended to be used by various plugin commands.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being checked.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const checkFileStructure = (pluginDirectoryPath, pluginName, errors, warnings) => {
    console.log(chalk.cyan(`  Checking plugin file structure...`));
    const requiredFiles = ['index.js', `${pluginName}.config.yaml`, `${pluginName}-example.md`, 'README.md'];
    for (const file of requiredFiles) {
        if (fs.existsSync(path.join(pluginDirectoryPath, file))) {
            console.log(chalk.green(`    [✔] Found required file: '${file}'`));
        } else {
            errors.push(`Missing required file: '${file}'.`);
            console.log(chalk.red(`    [✖] Missing required file: '${file}'`));
        }
    }

    console.log(chalk.cyan(`  Checking for optional files...`));
    const testDir = path.join(pluginDirectoryPath, 'test');
    if (fs.existsSync(testDir)) {
        console.log(chalk.green(`    [✔] Found optional 'test/' directory.`));
    } else {
        warnings.push(`Missing optional 'test/' directory.`);
        console.log(chalk.yellow(`    [!] Missing optional 'test/' directory.`));
    }

    const schemaFileName = `${pluginName}.schema.json`;
    const schemaPath = path.join(pluginDirectoryPath, schemaFileName);
    if (fs.existsSync(schemaPath)) {
        console.log(chalk.green(`    [✔] Plugin has a schema file ('${schemaFileName}').`));
    } else {
        warnings.push(`Missing optional schema file ('${schemaFileName}').`);
        console.log(chalk.yellow(`    [!] Plugin does not have a specific schema file ('${schemaFileName}').`));
    }
};

/**
 * Runs the co-located E2E test file for a given plugin.
 * A failure of the test itself is considered a validation error.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being tested.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const runInSituTest = (pluginDirectoryPath, pluginName, errors, warnings) => {
    console.log(chalk.cyan(`  Checking plugin's test setup...`));
    const e2eTestPath = path.join(pluginDirectoryPath, 'test', `${pluginName}-e2e.test.js`);

    if (!fs.existsSync(e2eTestPath)) {
        warnings.push(`Missing E2E test file, skipping test run: '${path.basename(e2eTestPath)}'.`);
        console.log(chalk.yellow(`    [!] Missing E2E test file, skipping run.`));
        return;
    }
    console.log(chalk.green(`    [✔] Found E2E test file: '${path.basename(e2eTestPath)}'`));

    try {
        console.log(chalk.cyan(`    Running in-situ E2E test...`));
        const projectRoot = process.cwd();
        const mochaPath = path.join(projectRoot, 'node_modules', 'mocha', 'bin', 'mocha');
        const command = `node "${mochaPath}" "${e2eTestPath}" --no-config --no-opts`;
        execSync(command, { cwd: projectRoot, stdio: 'pipe' });
        console.log(chalk.green(`    [✔] In-situ test passes.`));
    } catch (e) {
        errors.push('In-situ E2E test failed');
        console.log(chalk.red(`    [✖] In-situ test failed.`));
    }
};

/**
 * Performs a self-activation sanity check by attempting to run the plugin's example.
 * A failure in this check is considered a WARNING, not an error.
 * @param {string} pluginDirectoryPath - Absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin being checked.
 * @param {Array<string>} errors - An array to push error messages into.
 * @param {Array<string>} warnings - An array to push warning messages into.
 */
const runSelfActivation = (pluginDirectoryPath, pluginName, errors, warnings) => {
    console.log(chalk.cyan(`  Performing self-activation sanity check...`));
    const exampleMdPath = path.join(pluginDirectoryPath, `${pluginName}-example.md`);
    const configYamlPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);

    if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
        errors.push('Self-activation check failed: The plugin could not be activated.');
        console.log(chalk.red(`    [✖] Self-activation check failed.`));
        return;
    }

    const projectRoot = process.cwd();
    const cliPath = path.join(projectRoot, 'cli.js');
    const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `md-to-pdf-test-${pluginName}-`));
    try {
        const command = `node "${cliPath}" convert "${exampleMdPath}" --config "${configYamlPath}" --outdir "${tempOutputDir}" --no-open`;
        execSync(command, { cwd: projectRoot, stdio: 'pipe' });
        console.log(chalk.green(`    [✔] Self-activation successful.`));
    } catch (e) {
        warnings.push('Self-activation check generated a warning.');
        console.log(chalk.yellow(`    [!] Self-activation check failed.`));
    } finally {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
};

/**
 * Validates a plugin based on the v1 contract. This is the main function
 * called by the central plugin-validator dispatcher. It orchestrates the granular checks.
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @param {object} pluginMetadata - Pre-resolved metadata for the plugin.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - The complete validation result.
 */
function validateV1(pluginDirectoryPath, pluginMetadata) {
    const errors = [];
    const warnings = [];
    const pluginName = pluginMetadata.plugin_name.value;

    // The granular functions now handle their own logging.
    checkFileStructure(pluginDirectoryPath, pluginName, errors, warnings);
    runInSituTest(pluginDirectoryPath, pluginName, errors, warnings);
    const readmePath = path.join(pluginDirectoryPath, 'README.md');
    checkReadmeFrontMatterV1(readmePath, pluginName, warnings);
    runSelfActivation(pluginDirectoryPath, pluginName, errors, warnings);

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}


module.exports = {
    // The main validation function for the dispatcher
    validateV1,
    // Granular functions for other commands and the E2E test harness
    checkFileStructure,
    runInSituTest,
    runSelfActivation,
    checkReadmeFrontMatterV1
};
