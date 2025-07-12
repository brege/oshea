// src/plugins/validator.js
const { v1ValidatorPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load versioned validators
const v1Validator = require(v1ValidatorPath);


function resolvePluginPath(pluginIdentifier) {
  const resolvedIdentifier = path.resolve(pluginIdentifier);
  if (fs.existsSync(resolvedIdentifier) && fs.statSync(resolvedIdentifier).isDirectory()) {
    return { pluginDirectoryPath: resolvedIdentifier, pluginName: path.basename(resolvedIdentifier) };
  }
  const { projectRoot } = require('@paths');
  const pluginDirectoryPath = path.join(projectRoot, 'plugins', pluginIdentifier);
  if (!fs.existsSync(pluginDirectoryPath) || !fs.statSync(pluginDirectoryPath).isDirectory()) {
    throw new Error(`Error: Plugin directory not found for identifier: '${pluginIdentifier}'.`);
  }
  return { pluginDirectoryPath, pluginName: pluginIdentifier };
}



function getPluginMetadata(pluginDirectoryPath, pluginName, warnings) {
  const metadata = {
    plugin_name: { value: undefined, source: undefined },
    version: { value: undefined, source: undefined },
    protocol: { value: undefined, source: undefined },
  };

  logger.info(`Resolving plugin metadata for '${pluginName}'...`, { module: 'src/plugins/validator.js' });

  const readYamlFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
        logger.detail(`    (Read YAML from: ${path.basename(filePath)})`, { module: 'src/plugins/validator.js' });
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
    warnings.push('Plugin version not found in config.');
  }
  if (metadata.protocol.value === undefined) {
    metadata.protocol.value = 'v1'; // Default to v1 as per requirements
    metadata.protocol.source = 'default (v1)';
    warnings.push('Plugin protocol not found in config. Defaulting to \'v1\'.');
  }

  // Ensure protocol is a string
  metadata.protocol.value = String(metadata.protocol.value);

  logger.detail(`    Plugin Name: ${metadata.plugin_name.value} (from ${metadata.plugin_name.source})`, { module: 'src/plugins/validator.js' });
  logger.detail(`    Version: ${metadata.version.value || 'N/A (Warning)'} (from ${metadata.version.source})`, { module: 'src/plugins/validator.js' });
  logger.detail(`    Protocol: ${metadata.protocol.value} (from ${metadata.protocol.source})`, { module: 'src/plugins/validator.js' });


  return metadata;
}



function validate(pluginIdentifier) {
  const errors = [];
  const warnings = [];

  let pluginDirectoryPath, pluginName;
  try {
    ({ pluginDirectoryPath, pluginName } = resolvePluginPath(pluginIdentifier));
  } catch (error) {
    logger.error(error.message, { module: 'src/plugins/validator.js' });
    return { isValid: false, errors: [error.message], warnings: [] };
  }

  const pluginMetadata = getPluginMetadata(pluginDirectoryPath, pluginName, warnings);

  // Ensure plugin_name derived from metadata matches the directory name for core consistency
  if (pluginMetadata.plugin_name.value !== pluginName) {
    const nameMismatchError = `Resolved 'plugin_name' ('${pluginMetadata.plugin_name.value}') does not match plugin directory name ('${pluginName}'). This is a critical mismatch.`;
    logger.error(`\n[✖] Plugin is INVALID: ${nameMismatchError}`, { module: 'src/plugins/validator.js' });
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
  {
    const errorMsg = `Unsupported plugin protocol '${pluginMetadata.protocol.value}' for plugin '${pluginName}'.`;
    logger.error(`\n[✖] Plugin is INVALID: ${errorMsg}`, { module: 'src/plugins/validator.js' });
    errors.push(errorMsg);
    validationResult = { isValid: false, errors: [errorMsg], warnings: [] };
    break;
  }
  }

  validationResult.warnings = [...warnings, ...validationResult.warnings];
  validationResult.isValid = validationResult.isValid && (errors.length === 0);

  logger.info(`\n--- Summary for ${pluginName} ---`, { module: 'src/plugins/validator.js' });
  if (validationResult.isValid) {
    if (validationResult.warnings.length === 0) {
      logger.success(`[✔] Plugin '${pluginName}' is VALID.`, { module: 'src/plugins/validator.js' });
    } else {
      logger.warn(`[!] Plugin '${pluginName}' is USABLE (with warnings).`, { module: 'src/plugins/validator.js' });
    }
  } else {
    logger.error(`[✖] Plugin '${pluginName}' is INVALID.`, { module: 'src/plugins/validator.js' });
  }

  if (validationResult.errors.length > 0) {
    logger.error('\nErrors:', { module: 'src/plugins/validator.js' });
    validationResult.errors.forEach((error) => {
      logger.error(`  - ${error}`, { module: 'src/plugins/validator.js' });
    });
  }

  if (validationResult.warnings.length > 0) {
    logger.warn('\nWarnings:', { module: 'src/plugins/validator.js' });
    validationResult.warnings.forEach((warning) => {
      logger.warn(`  - ${warning}`, { module: 'src/plugins/validator.js' });
    });
  } else if (validationResult.isValid) {
    logger.success('No warnings found.', { module: 'src/plugins/validator.js' });
  }

  return validationResult;
}

module.exports = { validate };
