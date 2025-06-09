// src/plugin-validator.js - FINALIZED OUTPUT & VALID/USABLE DISTINCTION

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Helper function to check README.md front matter.
 * @param {string} readmePath - Path to the README.md file.
 * @param {string} pluginName - The name of the plugin.
 * @param {Array<string>} warnings - Array to push warnings into.
 * @returns {void}
 */
function _checkReadmeFrontMatter(readmePath, pluginName, warnings) {
    console.log(chalk.yellow(`Checking README.md front matter:`));
    if (!fs.existsSync(readmePath)) {
        console.log(chalk.red(`  [✖] README.md file not found. (Error reported in file tree check)`));
        return;
    }

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const frontMatterDelimiter = '---';
    const parts = readmeContent.split(frontMatterDelimiter);

    if (parts.length >= 3 && parts[0].trim() === '') {
        try {
            const frontMatter = yaml.load(parts[1]);
            if (!frontMatter || typeof frontMatter !== 'object') {
                console.log(chalk.red(`  [✖] Could not parse YAML or front matter is not an object.`));
                warnings.push(`README.md for '${pluginName}' has invalid front matter. Ensure it's valid YAML and an object.`);
            } else {
                // Checking for plugin_name
                if (frontMatter.plugin_name !== pluginName) {
                    console.log(chalk.red(`  [✖] 'plugin_name' in README.md does not match plugin directory name or is missing.`));
                    warnings.push(`README.md for '${pluginName}' should have a top-level 'plugin_name: ${pluginName}' declaration in its front matter.`);
                } else {
                    console.log(chalk.green(`  [✔] 'plugin_name' matches '${pluginName}'`));
                }

                // Checking for version
                if (typeof frontMatter.version === 'undefined') {
                    console.log(chalk.red(`  [✖] 'version' declaration is missing in README.md front matter.`));
                    warnings.push(`README.md for '${pluginName}' is missing a 'version' declaration in its front matter. This 'version' field implicitly declares the contract version adherence.`);
                } else {
                    console.log(chalk.green(`  [✔] 'version' found: '${frontMatter.version}'`));
                }
            }
        } catch (e) {
            console.log(chalk.red(`  [✖] Could not parse YAML front matter: ${e.message}`));
            warnings.push(`Could not parse README.md front matter for '${pluginName}': ${e.message}. Ensure it's valid YAML.`);
        }
    } else {
        console.log(chalk.red(`  [✖] README.md does not have a valid YAML front matter block (e.g., missing leading '---' or content before it).`));
        warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
    }
}


/**
 * Validates a plugin against the defined contract, providing chronological feedback.
 * The contract requires specific file presence, naming conventions, and a passing E2E test (if present).
 * The plugin's adherence to the contract version is determined by the 'version' field in its README.md front matter.
 *
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - Validation result.
 */
function validate(pluginDirectoryPath) {
    const errors = [];
    const warnings = [];
    const pluginName = path.basename(pluginDirectoryPath);

    console.log(chalk.bold(`\n--- Validating Plugin: ${pluginName} ---`));

    const readmePath = path.join(pluginDirectoryPath, 'README.md');

    // --- Check 1: Required File Presence ---
    console.log(chalk.yellow(`Checking file tree of plugin contents:`));
    const requiredFiles = [
        'index.js',
        `${pluginName}.config.yaml`,
        `${pluginName}-example.md`,
        'README.md',
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(pluginDirectoryPath, file);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`  [✖] Missing required file: '${file}'`));
            errors.push(`Missing required file: '${file}' at expected path: '${filePath}'.`);
        } else {
            console.log(chalk.green(`  [✔] Found required file: '${file}'`));
        }
    }


    // --- Check 2: Test Directory and E2E Test File Existence (Warning for v1 if missing) ---
    console.log(chalk.yellow(`Checking plugin's test structure and E2E test file:`));
    const e2eTestDirectory = path.join(pluginDirectoryPath, 'test');
    const e2eTestFileName = `${pluginName}-e2e.test.js`;
    const e2eTestPath = path.join(e2eTestDirectory, e2eTestFileName);

    if (!fs.existsSync(e2eTestDirectory)) {
        console.log(chalk.yellow(`  [!] Missing required 'test/' directory`));
        warnings.push(`Missing required 'test/' directory for plugin: '${pluginName}' at '${e2eTestDirectory}'. (For v1 contract, this is a warning, for future versions, it may be an error.)`);
    } else {
        console.log(chalk.green(`  [✔] Found required 'test/' directory`));

        if (!fs.existsSync(e2eTestPath)) {
            console.log(chalk.yellow(`  [!] Missing required E2E test file: '${e2eTestFileName}'`));
            warnings.push(`Missing E2E test file: '${e2eTestFileName}' at expected path: '${e2eTestPath}'. (For v1 contract, this is a warning, for future versions, it may be an error.)`);
        } else {
            console.log(chalk.green(`  [✔] Found E2E test file: '${e2eTestFileName}'`));

            // --- Check 2.1: Programmatically Run Co-located E2E Test (Error if exists and fails) ---
            console.log(chalk.cyan(`  Running in-situ test...`));
            try {
                const projectRoot = path.resolve(pluginDirectoryPath, '../../');
                const relativeTestPath = path.relative(projectRoot, e2eTestPath);
                execSync(`npx mocha "${relativeTestPath}"`, { cwd: projectRoot, stdio: 'pipe' });
                console.log(chalk.green(`  [✔] In-situ test passes.`));
            } catch (mochaError) {
                console.log(chalk.red(`  [✖] In-situ test failed.`));
                errors.push(`E2E test for '${pluginName}' failed: ${mochaError.message}`);
            }
        }
    }


    // --- Check 3: Plugin Schema File Existence (Warning if missing) ---
    console.log(chalk.yellow(`Checking for plugin schema file:`));
    const schemaFileName = `${pluginName}.schema.json`;
    const schemaPath = path.join(pluginDirectoryPath, schemaFileName);
    if (fs.existsSync(schemaPath)) {
        console.log(chalk.green(`  [✔] Plugin has a schema file ('${schemaFileName}')`));
    } else {
        console.log(chalk.yellow(`  [!] Plugin does not have a specific schema file ('${schemaFileName}')`));
        warnings.push(`Plugin '${pluginName}' does not have a specific schema file ('${schemaFileName}'). Will rely on base schema or default validation.`);
    }


    // --- Check 4: README Front Matter (using helper function) ---
    _checkReadmeFrontMatter(readmePath, pluginName, warnings);


    // --- Final Summary ---
    console.log(chalk.bold(`\n--- Validation Summary for ${pluginName} ---`));
    if (errors.length === 0) {
        if (warnings.length === 0) {
            console.log(chalk.green(`Plugin '${pluginName}' is VALID and adheres to the contract.`));
        } else {
            // Use an orange-like color for "USABLE"
            console.log(chalk.rgb(255, 165, 0)(`Plugin '${pluginName}' is USABLE but has warnings.`));
        }
    } else {
        console.error(chalk.red(`Plugin '${pluginName}' is INVALID. Found contract violations:`));
        errors.forEach((error) => {
            console.error(chalk.red(`  - ${error}`));
        });
    }

    if (warnings.length > 0) {
        console.log(chalk.yellow(`\nWarnings for plugin '${pluginName}':`));
        warnings.forEach((warning) => {
            console.log(chalk.yellow(`  - ${warning}`));
        });
    } else if (errors.length === 0) {
        console.log(chalk.green(`No warnings found for plugin '${pluginName}'.`));
    }

    console.log(chalk.bold(`--- End Validation Summary ---`));

    // The return value will still determine the process exit code in validateCmd.js
    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

module.exports = { validate };
