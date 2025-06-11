// dev/src/plugin-validator.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

// Load versioned validators
const v1Validator = require('./plugin-validators/v1');

/**
 * Universal metadata lookup function.
 * Prioritized lookup order for 'plugin_name', 'version', and 'protocol'.
 * 1. plugins/{plugin-name}/{plugin-name}.schema.json
 * 2. plugins/{plugin-name}/{plugin-name}.config.yaml
 * 3. plugins/{plugin-name}/README.md (front matter)
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

    // Removed leading newline to consolidate output with previous "Validating Plugin" line
    console.log(chalk.cyan(`Resolving plugin metadata for '${pluginName}'...`));

    // Helper to read JSON
    const readJsonFile = (filePath) => {
        if (fs.existsSync(filePath)) {
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                console.log(chalk.gray(`    (Read JSON from: ${path.basename(filePath)})`));
                return content;
            } catch (e) {
                warnings.push(`Could not parse JSON from '${path.basename(filePath)}': ${e.message}`);
            }
        }
        return null;
    };

    // Helper to read YAML
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

    // Helper to read README front matter
    const readReadmeFrontMatter = (readmePath) => {
        if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');
            const frontMatterDelimiter = '---';
            const parts = readmeContent.split(frontMatterDelimiter);
            if (parts.length >= 3 && parts[0].trim() === '') {
                try {
                    const content = yaml.load(parts[1]);
                    console.log(chalk.gray(`    (Read front matter from: ${path.basename(readmePath)})`));
                    return content;
                } catch (e) {
                    warnings.push(`Could not parse YAML front matter from '${path.basename(readmePath)}': ${e.message}`);
                }
            }
        }
        return null;
    };

    // --- 1. Check .schema.json ---
    const schemaPath = path.join(pluginDirectoryPath, `${pluginName}.schema.json`);
    const schemaContent = readJsonFile(schemaPath);
    if (schemaContent) {
        if (schemaContent.plugin_name && metadata.plugin_name.value === undefined) {
            metadata.plugin_name.value = schemaContent.plugin_name;
            metadata.plugin_name.source = 'schema';
        }
        if (schemaContent.version && metadata.version.value === undefined) {
            metadata.version.value = schemaContent.version;
            metadata.version.source = 'schema';
        }
        if (schemaContent.protocol && metadata.protocol.value === undefined) {
            metadata.protocol.value = schemaContent.protocol;
            metadata.protocol.source = 'schema';
        }
    }

    // --- 2. Check .config.yaml ---
    const configPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
    const configContent = readYamlFile(configPath);
    if (configContent) {
        if (configContent.plugin_name && metadata.plugin_name.value === undefined) {
            metadata.plugin_name.value = configContent.plugin_name;
            metadata.plugin_name.source = 'config';
        }
        if (configContent.version && metadata.version.value === undefined) {
            metadata.version.value = configContent.version;
            metadata.version.source = 'config';
        }
        if (configContent.protocol && metadata.protocol.value === undefined) {
            metadata.protocol.value = configContent.protocol;
            metadata.protocol.source = 'config';
        }
    }

    // --- 3. Check README.md front matter ---
    const readmePath = path.join(pluginDirectoryPath, 'README.md');
    const readmeFrontMatter = readReadmeFrontMatter(readmePath);
    if (readmeFrontMatter) {
        if (readmeFrontMatter.plugin_name && metadata.plugin_name.value === undefined) {
            metadata.plugin_name.value = readmeFrontMatter.plugin_name;
            metadata.plugin_name.source = 'README';
        }
        if (readmeFrontMatter.version && metadata.version.value === undefined) {
            metadata.version.value = readmeFrontMatter.version;
            metadata.version.source = 'README';
        }
        if (readmeFrontMatter.protocol && metadata.protocol.value === undefined) {
            metadata.protocol.value = readmeFrontMatter.protocol;
            metadata.protocol.source = 'README';
        }
    }

    // Final checks and defaults
    if (metadata.plugin_name.value === undefined) {
        metadata.plugin_name.value = pluginName; // Default to directory name if not found anywhere
        metadata.plugin_name.source = 'default (directory name)';
        warnings.push(`Plugin name not found in schema, config, or README. Defaulting to directory name: '${pluginName}'.`);
    }
    if (metadata.version.value === undefined) {
        metadata.version.source = 'default';
        warnings.push(`Plugin version not found.`);
    }
    if (metadata.protocol.value === undefined) {
        metadata.protocol.value = 'v1'; // Default to v1 as per requirements
        metadata.protocol.source = 'default (v1)';
        warnings.push(`Plugin protocol not found in schema, config, or README. Defaulting to 'v1'.`);
    }

    // Ensure protocol is a string
    metadata.protocol.value = String(metadata.protocol.value);

    // Changed to gray for softer output, removed "Resolved metadata:" line
    console.log(chalk.gray(`    Plugin Name: ${metadata.plugin_name.value} (from ${metadata.plugin_name.source})`));
    console.log(chalk.gray(`    Version: ${metadata.version.value || 'N/A (Warning)'} (from ${metadata.version.source})`));
    console.log(chalk.gray(`    Protocol: ${metadata.protocol.value} (from ${metadata.protocol.source})`));

    return metadata;
}


/**
 * Main dispatcher for plugin validation. Determines the contract version
 * and routes to the appropriate validator module.
 *
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} - Validation result.
 */
function validate(pluginDirectoryPath) {
    const errors = [];
    const warnings = [];
    const pluginName = path.basename(pluginDirectoryPath);

    // console.log(chalk.bold(`\nValidating Plugin: ${pluginName}`)); // Removed this line and leading newline

    // Step 1: Resolve universal metadata
    // The getPluginMetadata function will print its own leading newline.
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
        // Future cases will go here:
        // case 'v2':
        //     const v2Validator = require('./plugin-validators/v2');
        //     validationResult = v2Validator.validateV2(pluginDirectoryPath, pluginMetadata);
        //     break;
        default:
            const errorMsg = `Unsupported plugin protocol '${pluginMetadata.protocol.value}' for plugin '${pluginName}'.`;
            console.error(chalk.red(`\n[✖] Plugin is INVALID: ${errorMsg}`));
            errors.push(errorMsg);
            validationResult = { isValid: false, errors: errors, warnings: [] };
            break;
    }

    // Consolidate warnings from metadata lookup and specific validator
    validationResult.warnings = [...warnings, ...validationResult.warnings];
    validationResult.isValid = validationResult.isValid && (errors.length === 0);

    // Final Summary by dispatcher
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

    // Removed the final separator line
    // console.log(chalk.bold(`-----------------------------------`));

    return validationResult;
}

module.exports = { validate };
