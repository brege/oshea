// src/config/config_utils.js
const fs = require('fs'); // Used by _loadYamlConfig (moved from ConfigResolver for broader use if needed)
const yaml = require('js-yaml'); // Used by _loadYamlConfig

/**
 * Checks if an item is a plain object.
 * @param {*} item - The item to check.
 * @returns {boolean} True if the item is a plain object, false otherwise.
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deeply merges properties of a source object into a target object.
 * Special handling for 'css_files' and 'inherit_css' to ensure they are directly replaced or handled by AssetResolver.
 * For 'handler_script', it's typically not merged from overrides in the same way other properties are;
 * it's usually taken from the base plugin config.
 * @param {Object} target - The target object.
 * @param {Object} source - The source object.
 * @returns {Object} The merged object.
 */
function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (key === 'handler_script') { // Handler script is usually not overridden by simple merge
                if (target[key] === undefined && source[key] !== undefined) {
                    output[key] = source[key]; // Only if target doesn't have one
                }
            } else if (key === 'css_files' || key === 'inherit_css') { // These are handled by AssetResolver
                if (source[key] !== undefined) {
                    output[key] = source[key];
                }
            } else if (isObject(source[key]) && key in target && isObject(target[key])) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
}

/**
 * Loads and parses a YAML configuration file.
 * (Moved from markdown_utils to here if it's primarily for config system, or keep in markdown_utils if widely used)
 * For now, keeping a version here for clarity of config system.
 * @async
 * @param {string} configPath - Absolute path to the YAML configuration file.
 * @returns {Promise<Object>} The parsed configuration object.
 * @throws {Error} If the file is not found, is empty, or cannot be parsed.
 */
async function loadYamlConfig(configPath) {
    if (!fs.existsSync(configPath)) { // Note: Changed to synchronous fs.existsSync for this initial check
        throw new Error(`Configuration file '${configPath}' not found.`);
    }
    try {
        const fileContents = await fs.promises.readFile(configPath, 'utf8'); // Use fs.promises
        const config = yaml.load(fileContents);
        if (!config) {
            return {}; // Return empty object for empty or invalid YAML to avoid breaking merges
            // throw new Error(`Configuration file '${configPath}' is empty or invalid.`);
        }
        return config;
    } catch (error) {
        throw new Error(`Error loading or parsing '${configPath}': ${error.message}`);
    }
}


module.exports = {
    isObject,
    deepMerge,
    loadYamlConfig
};
