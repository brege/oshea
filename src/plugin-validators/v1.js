// dev/src/plugin-validators/v1.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const yaml = require('js-yaml');
const os = require('os'); // Required for temporary directory operations

/**
 * Helper function to check README.md front matter for v1 protocol.
 * This function is designed to be called by the dispatcher for metadata resolution,
 * but also internally by validateV1 to ensure specific v1 README rules are met.
 * It also handles the default protocol assignment for v1.
 * @param {string} readmePath - Path to the README.md file.
 * @param {string} pluginName - The name of the plugin.
 * @param {Array<string>} warnings - Array to push warnings into.
 * @returns {object} - Object containing found metadata (plugin_name, version, protocol) and if protocol was defaulted.
 */
function checkReadmeFrontMatterV1(readmePath, pluginName, warnings) {
    const metadata = {
        plugin_name: undefined,
        version: undefined,
        protocol: undefined,
        protocol_defaulted: false
    };

    if (!fs.existsSync(readmePath)) {
        return metadata; // Error already reported by file tree check in validateV1
    }

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const frontMatterDelimiter = '---';
    const parts = readmeContent.split(frontMatterDelimiter);

    if (parts.length >= 3 && parts[0].trim() === '') {
        try {
            const frontMatter = yaml.load(parts[1]);
            if (!frontMatter || typeof frontMatter !== 'object') {
                warnings.push(`README.md for '${pluginName}' has invalid front matter. Ensure it's valid YAML and an object.`);
            } else {
                if (frontMatter.plugin_name !== undefined) {
                    metadata.plugin_name = frontMatter.plugin_name;
                    if (frontMatter.plugin_name !== pluginName) {
                        warnings.push(`'plugin_name' in README.md ('${frontMatter.plugin_name}') does not match plugin directory name ('${pluginName}').`);
                    }
                } else {
                    warnings.push(`README.md for '${pluginName}' is missing a 'plugin_name' declaration in its front matter.`);
                }

                if (frontMatter.version !== undefined) {
                    metadata.version = frontMatter.version;
                } else {
                    warnings.push(`README.md for '${pluginName}' is missing a 'version' declaration in its front matter.`);
                }

                if (frontMatter.protocol !== undefined) {
                    metadata.protocol = String(frontMatter.protocol);
                } else {
                    metadata.protocol = 'v1';
                    metadata.protocol_defaulted = true;
                    warnings.push(`README.md for '${pluginName}' is missing a 'protocol' declaration in its front matter. Defaulting to 'v1'.`);
                }
            }
        } catch (e) {
            warnings.push(`Could not parse README.md front matter for '${pluginName}': ${e.message}. Ensure it's valid YAML.`);
        }
    } else {
        warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
    }
    return metadata;
}

/**
 * Validates a plugin based on the v1 contract.
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @param {object} pluginMetadata - Pre-resolved metadata for the plugin (plugin_name, version, protocol).
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - Validation result.
 */
function validateV1(pluginDirectoryPath, pluginMetadata) {
    const errors = [];
    const warnings = [];
    const pluginName = pluginMetadata.plugin_name.value;

    const readmePath = path.join(pluginDirectoryPath, 'README.md');

    // --- Check 1: Required File Presence ---
    console.log(chalk.cyan(`  Checking plugin file structure...`));
    const requiredFiles = [
        'index.js',
        `${pluginName}.config.yaml`,
        `${pluginName}-example.md`,
        'README.md',
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(pluginDirectoryPath, file);
        if (!fs.existsSync(filePath)) {
            console.log(chalk.red(`    [✖] Missing required file: '${file}'`));
            errors.push(`Missing required file: '${file}' at expected path: '${filePath}'.`);
        } else {
            console.log(chalk.green(`    [✔] Found required file: '${file}'`));
        }
    }

    // --- Check 2: Test Directory and E2E Test File Existence (Warning for v1 if missing) ---
    console.log(chalk.cyan(`  Checking plugin's test setup...`));
    const e2eTestDirectory = path.join(pluginDirectoryPath, 'test');
    const e2eTestFileName = `${pluginName}-e2e.test.js`;
    const e2eTestPath = path.join(e2eTestDirectory, e2eTestFileName);

    if (!fs.existsSync(e2eTestDirectory)) {
        console.log(chalk.yellow(`    [!] Missing required 'test/' directory`));
        warnings.push(`Missing required 'test/' directory for plugin: '${pluginName}'.`);
    } else {
        console.log(chalk.green(`    [✔] Found required 'test/' directory`));

        if (!fs.existsSync(e2eTestPath)) {
            console.log(chalk.yellow(`    [!] Missing required E2E test file: '${e2eTestFileName}'`));
            warnings.push(`Missing E2E test file: '${e2eTestFileName}'.`);
        } else {
            console.log(chalk.green(`    [✔] Found E2E test file: '${e2eTestFileName}'`));

            // --- Check 2.1: Programmatically Run Co-located E2E Test (Error if exists and fails) ---
            console.log(chalk.cyan(`    Running in-situ E2E test...`));
            try {
                const projectRoot = process.cwd();
                const relativeTestPath = path.relative(projectRoot, e2eTestPath);
                execSync(`node node_modules/mocha/bin/mocha "${relativeTestPath}"`, { cwd: projectRoot, stdio: 'pipe' });
                console.log(chalk.green(`    [✔] In-situ test passes.`));
            } catch (mochaError) {
                console.log(chalk.red(`    [✖] In-situ test failed.`));
                errors.push(`E2E test for '${pluginName}' failed: ${mochaError.message.split('\\n')[0].trim()}.`);
            }
        }
    }

    // --- Check 3: Plugin Schema File Existence (Warning if missing) ---
    console.log(chalk.cyan(`  Checking for plugin schema file...`));
    const schemaFileName = `${pluginName}.schema.json`;
    const schemaPath = path.join(pluginDirectoryPath, schemaFileName);
    if (fs.existsSync(schemaPath)) {
        console.log(chalk.green(`    [✔] Plugin has a schema file ('${schemaFileName}')`));
    } else {
        console.log(chalk.yellow(`    [!] Plugin does not have a specific schema file ('${schemaFileName}')`));
        warnings.push(`Plugin '${pluginName}' does not have a specific schema file ('${schemaFileName}').`);
    }

    // --- Check 4: README Front Matter (re-check here for v1 specific values) ---
    console.log(chalk.cyan(`  Checking README.md front matter...`));
    checkReadmeFrontMatterV1(readmePath, pluginName, warnings); // Warnings are pushed directly to the 'warnings' array

    // --- Check 5: Self-Activation Sanity Check ---
    console.log(chalk.cyan(`  Performing self-activation sanity check...`));
    const exampleMdPath = path.join(pluginDirectoryPath, `${pluginName}-example.md`);
    const configYamlPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);

    if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
        console.log(chalk.yellow(`    [!] Skipping self-activation: Missing example Markdown or config file.`));
        warnings.push(`Self-activation check skipped for '${pluginName}': Missing '${pluginName}-example.md' or '${pluginName}.config.yaml'.`);
    } else {
        const projectRoot = process.cwd();
        const relativeCliPath = path.relative(projectRoot, path.join(projectRoot, 'cli.js'));
        const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `md-to-pdf-test-${pluginName}-`));
        // Force a predictable filename using --filename option
        const outputFilename = `${pluginName}-sanity-check-output`;
        const tempOutputFilePath = path.join(tempOutputDir, `${outputFilename}.pdf`);

        try {
            // Use --outdir instead of --output-dir and add --filename
            const command = `node "${relativeCliPath}" convert "${exampleMdPath}" --config "${configYamlPath}" --outdir "${tempOutputDir}" --filename "${outputFilename}" --no-open`;
            execSync(command, { cwd: projectRoot, stdio: 'pipe' });

            // Check if PDF was created and has non-zero size
            const stats = fs.statSync(tempOutputFilePath);
            if (stats.isFile() && stats.size > 0) {
                console.log(chalk.green(`    [✔] Self-activation successful. Generated PDF: ${tempOutputFilePath}`));
            } else {
                console.log(chalk.red(`    [✖] Self-activation failed: Generated PDF is missing or empty.`));
                errors.push(`Self-activation check failed for '${pluginName}': Generated PDF is missing or empty.`);
            }
        } catch (cmdError) {
            console.log(chalk.red(`    [✖] Self-activation failed: Command execution error.`));
            // Only capture the first line of the error message for conciseness
            errors.push(`Self-activation check failed for '${pluginName}': ${cmdError.message.split('\\n')[0].trim()}`);
        } finally {
            // Clean up temporary files and directory
            try {
                if (fs.existsSync(tempOutputDir)) {
                    fs.rmSync(tempOutputDir, { recursive: true, force: true });
                }
            } catch (cleanupError) {
                console.error(chalk.red(`    [!] Error cleaning up temporary directory '${tempOutputDir}': ${cleanupError.message}`));
                warnings.push(`Cleanup error for temporary directory '${tempOutputDir}': ${cleanupError.message}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

module.exports = { validateV1, checkReadmeFrontMatterV1 };
