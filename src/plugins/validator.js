// src/plugins/validator.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

// Load versioned validators
const v1Validator = require('../validators/v1');

/**
 * Resolves the absolute path and name of a plugin.
 * (Moved from src/plugin-contract/index.js and path resolution corrected)
 * @param {string} pluginIdentifier - The identifier of the plugin (path or name).
 * @returns {{pluginDirectoryPath: string, pluginName: string}} - Resolved paths.
 * @throws {Error} If the plugin directory is not found.
 */
function resolvePluginPath(pluginIdentifier) {
    const resolvedIdentifier = path.resolve(pluginIdentifier);
    if (fs.existsSync(resolvedIdentifier) && fs.statSync(resolvedIdentifier).isDirectory()) {
        return { pluginDirectoryPath: resolvedIdentifier, pluginName: path.basename(resolvedIdentifier) };
    }
    const projectRoot = path.resolve(__dirname, '../../'); 
    const pluginDirectoryPath = path.join(projectRoot, 'plugins', pluginIdentifier);
    if (!fs.existsSync(pluginDirectoryPath) || !fs.statSync(pluginDirectoryPath).isDirectory()) {
        throw new Error(`Error: Plugin directory not found for identifier: '${pluginIdentifier}'.`);
    }
    return { pluginDirectoryPath, pluginName: pluginIdentifier };
}


/**
 * Universal metadata lookup function.
 * Looks for 'plugin_name', 'version', and 'protocol' in the plugin's config file.
 *
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin (directory name).
 * @param {Array<string>} warnings - Array to push warnings into.
 * @returns {object} - An object containing the resolved metadata.
 */
function getPluginMetadata(pluginDirectoryPath, pluginName, warnings) {
    const metadata = {
        plugin_name: { value: undefined, source: undefined },
        version: { value: undefined, source: undefined },
        protocol: { value: undefined, source: undefined },
    };

    console.log(chalk.cyan(`Resolving plugin metadata for '${pluginName}'...`));

    const readYamlFile = (filePath) => {
        if (fs.existsSync(filePath)) {
            try {
                const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
                console.log(chalk.gray(`    (Read YAML from: ${path.basename(filePath)})`));
                return content;
            } catch (e) {
                warnings.push(`Could not parse YAML from '${path.basename(filePath)}': ${e.message}`);
            }
        }
        return null;
    };

    // --- Check .config.yaml ---
    const configPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
    const configContent = readYamlFile(configPath);
    if (configContent) {
        if (configContent.plugin_name) {
            metadata.plugin_name.value = configContent.plugin_name;
            metadata.plugin_name.source = 'config';
        }
        if (configContent.version) {
            metadata.version.value = configContent.version;
            metadata.version.source = 'config';
        }
        if (configContent.protocol) {
            metadata.protocol.value = configContent.protocol;
            metadata.protocol.source = 'config';
        }
    }

    // Final checks and defaults
    if (metadata.plugin_name.value === undefined) {
        metadata.plugin_name.value = pluginName; // Default to directory name if not found anywhere
        metadata.plugin_name.source = 'default (directory name)';
        warnings.push(`Plugin name not found in config. Defaulting to directory name: '${pluginName}'.`);
    }
    if (metadata.version.value === undefined) {
        metadata.version.source = 'default';
        warnings.push(`Plugin version not found in config.`);
    }
    if (metadata.protocol.value === undefined) {
        metadata.protocol.value = 'v1'; // Default to v1 as per requirements
        metadata.protocol.source = 'default (v1)';
        warnings.push(`Plugin protocol not found in config. Defaulting to 'v1'.`);
    }

    // Ensure protocol is a string
    metadata.protocol.value = String(metadata.protocol.value);

    console.log(chalk.gray(`    Plugin Name: ${metadata.plugin_name.value} (from ${metadata.plugin_name.source})`));
    console.log(chalk.gray(`    Version: ${metadata.version.value || 'N/A (Warning)'} (from ${metadata.version.source})`));
    console.log(chalk.gray(`    Protocol: ${metadata.protocol.value} (from ${metadata.protocol.source})`));

    return metadata;
}


/**
 * Main dispatcher for plugin validation. Determines the contract version
 * and routes to the appropriate validator module.
 *
 * @param {string} pluginIdentifier - The identifier of the plugin (path or name).
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - Validation result.
 */
function validate(pluginIdentifier) {
    const errors = [];
    const warnings = [];

    let pluginDirectoryPath, pluginName;
    try {
        ({ pluginDirectoryPath, pluginName } = resolvePluginPath(pluginIdentifier));
    } catch (error) {
        console.error(chalk.red(error.message));
        return { isValid: false, errors: [error.message], warnings: [] };
    }


    const pluginMetadata = getPluginMetadata(pluginDirectoryPath, pluginName, warnings);

    // Ensure plugin_name derived from metadata matches the directory name for core consistency
    if (pluginMetadata.plugin_name.value !== pluginName) {
         const nameMismatchError = `Resolved 'plugin_name' ('${pluginMetadata.plugin_name.value}') does not match plugin directory name ('${pluginName}'). This is a critical mismatch.`;
         console.error(chalk.red(`\n[✖] Plugin is INVALID: ${nameMismatchError}`));
         errors.push(nameMismatchError);
         return {
            isValid: false,
            errors: errors,
            warnings: warnings
        };
    }

    let validationResult;
    switch (pluginMetadata.protocol.value.toLowerCase()) {
        case 'v1':
            validationResult = v1Validator.validateV1(pluginDirectoryPath, pluginMetadata);
            break;
        default:
            const errorMsg = `Unsupported plugin protocol '${pluginMetadata.protocol.value}' for plugin '${pluginName}'.`;
            console.error(chalk.red(`\n[✖] Plugin is INVALID: ${errorMsg}`));
            errors.push(errorMsg);
            validationResult = { isValid: false, errors: [errorMsg], warnings: [] };
            break;
    }

    validationResult.warnings = [...warnings, ...validationResult.warnings];
    validationResult.isValid = validationResult.isValid && (errors.length === 0);

    console.log(chalk.bold(`\n--- Summary for ${pluginName} ---`));
    if (validationResult.isValid) {
        if (validationResult.warnings.length === 0) {
            console.log(chalk.green(`[✔] Plugin '${pluginName}' is VALID.`));
        } else {
            console.log(chalk.rgb(255, 165, 0)(`[!] Plugin '${pluginName}' is USABLE (with warnings).`));
        }
    } else {
        console.log(chalk.red(`[✖] Plugin '${pluginName}' is INVALID.`));
    }

    if (validationResult.errors.length > 0) {
        console.error(chalk.red(`\nErrors:`));
        validationResult.errors.forEach((error) => {
            console.error(chalk.red(`  - ${error}`));
        });
    }

    if (validationResult.warnings.length > 0) {
        console.log(chalk.yellow(`\nWarnings:`));
        validationResult.warnings.forEach((warning) => {
            console.log(chalk.yellow(`  - ${warning}`));
        });
    } else if (validationResult.isValid) {
        console.log(chalk.green(`No warnings found.`));
    }

    return validationResult;
}

module.exports = { validate };
