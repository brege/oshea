// src/config/config-utils.js
const fs = require('fs'); // Used by _loadYamlConfig (moved from ConfigResolver for broader use if needed)
const yaml = require('js-yaml'); // Used by _loadYamlConfig

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (key === 'handler_script') {
        // Handler script is usually not overridden by simple merge
        if (target[key] === undefined && source[key] !== undefined) {
          output[key] = source[key]; // Only if target doesn't have one
        }
      } else if (key === 'css_files' || key === 'inherit_css') {
        // These are handled by AssetResolver
        if (source[key] !== undefined) {
          output[key] = source[key];
        }
      } else if (
        isObject(source[key]) &&
        key in target &&
        isObject(target[key])
      ) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

async function loadYamlConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    // Note: Changed to synchronous fs.existsSync for this initial check
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
    throw new Error(
      `Error loading or parsing '${configPath}': ${error.message}`,
      { cause: error },
    );
  }
}

module.exports = {
  isObject,
  deepMerge,
  loadYamlConfig,
};
