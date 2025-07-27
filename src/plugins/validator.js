// src/plugins/validator.js
const { v1Path, loggerPath } = require('@paths');
const logger = require(loggerPath);

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load versioned validators
const v1Validator = require(v1Path);


function resolvePluginPath(pluginIdentifier) {
  logger.debug('Attempting to resolve plugin path', {
    context: 'PluginValidator',
    pluginIdentifier: pluginIdentifier
  });

  const resolvedIdentifier = path.resolve(pluginIdentifier);
  if (fs.existsSync(resolvedIdentifier) && fs.statSync(resolvedIdentifier).isDirectory()) {
    logger.debug('Plugin path resolved as absolute directory', {
      context: 'PluginValidator',
      resolvedPath: resolvedIdentifier
    });
    return { pluginDirectoryPath: resolvedIdentifier, pluginName: path.basename(resolvedIdentifier) };
  }

  const { projectRoot } = require('@paths'); // Dynamically loaded to avoid circular deps if @paths points back to here
  const pluginDirectoryPath = path.join(projectRoot, 'plugins', pluginIdentifier);
  logger.debug('Plugin path not absolute, attempting to resolve from project plugins directory', {
    context: 'PluginValidator',
    pluginIdentifier: pluginIdentifier,
    projectRoot: projectRoot,
    derivedPath: pluginDirectoryPath
  });

  if (!fs.existsSync(pluginDirectoryPath) || !fs.statSync(pluginDirectoryPath).isDirectory()) {
    logger.error('Plugin directory not found', {
      context: 'PluginValidator',
      pluginIdentifier: pluginIdentifier,
      checkedPaths: [resolvedIdentifier, pluginDirectoryPath],
      error: `Plugin directory not found for identifier: '${pluginIdentifier}'.`
    });
    throw new Error(`Error: Plugin directory not found for identifier: '${pluginIdentifier}'.`);
  }
  logger.debug('Plugin path resolved from project plugins directory', {
    context: 'PluginValidator',
    resolvedPath: pluginDirectoryPath
  });
  return { pluginDirectoryPath, pluginName: pluginIdentifier };
}


function getPluginMetadata(pluginDirectoryPath, pluginName, warnings) {
  const metadata = {
    plugin_name: { value: undefined, source: undefined },
    version: { value: undefined, source: undefined },
    protocol: { value: undefined, source: undefined },
  };

  logger.debug('Resolving plugin metadata for plugin', {
    context: 'PluginValidator',
    pluginName: pluginName,
    pluginDirectoryPath: pluginDirectoryPath
  });

  const readYamlFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
        logger.debug('Read YAML from file', {
          context: 'PluginValidator',
          file: path.basename(filePath)
        });
        return content;
      } catch (e) {
        warnings.push(`Could not parse YAML from '${path.basename(filePath)}': ${e.message}`);
        logger.warn('Could not parse YAML from file', {
          context: 'PluginValidator',
          file: path.basename(filePath),
          error: e.message
        });
      }
    }
    return null;
  };

  // --- Check .config.yaml ---
  const configPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
  const configContent = readYamlFile(configPath);
  if (configContent) {
    logger.debug('Config file found and parsed', {
      context: 'PluginValidator',
      configPath: configPath
    });
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
  } else {
    logger.debug('Config file not found or could not be parsed', {
      context: 'PluginValidator',
      configPath: configPath
    });
  }

  // Final checks and defaults
  if (metadata.plugin_name.value === undefined) {
    metadata.plugin_name.value = pluginName; // Default to directory name if not found anywhere
    metadata.plugin_name.source = 'default (directory name)';
    warnings.push(`Plugin name not found in config. Defaulting to directory name: '${pluginName}'.`);
    logger.warn('Plugin name not found in config, defaulting to directory name', {
      context: 'PluginValidator',
      pluginName: pluginName,
      source: 'directory name'
    });
  }
  if (metadata.version.value === undefined) {
    metadata.version.source = 'default';
    warnings.push('Plugin version not found in config.');
    logger.warn('Plugin version not found in config', {
      context: 'PluginValidator',
      pluginName: pluginName,
      source: 'default'
    });
  }
  if (metadata.protocol.value === undefined) {
    metadata.protocol.value = 'v1'; // Default to v1 as per requirements
    metadata.protocol.source = 'default (v1)';
    warnings.push('Plugin protocol not found in config. Defaulting to \'v1\'.');
    logger.warn('Plugin protocol not found in config, defaulting to v1', {
      context: 'PluginValidator',
      pluginName: pluginName,
      protocol: 'v1',
      source: 'default'
    });
  }

  // Ensure protocol is a string
  metadata.protocol.value = String(metadata.protocol.value);

  logger.debug('Resolved plugin metadata summary', {
    context: 'PluginValidator',
    pluginName: metadata.plugin_name.value,
    pluginNameSource: metadata.plugin_name.source,
    version: metadata.version.value || 'N/A (Warning)',
    versionSource: metadata.version.source,
    protocol: metadata.protocol.value,
    protocolSource: metadata.protocol.source
  });

  return metadata;
}



function validate(pluginIdentifier) {
  const errors = [];
  const warnings = [];

  logger.debug('Starting plugin validation for identifier', {
    context: 'PluginValidator',
    pluginIdentifier: pluginIdentifier
  });

  let pluginDirectoryPath, pluginName;
  try {
    ({ pluginDirectoryPath, pluginName } = resolvePluginPath(pluginIdentifier));
    logger.debug('Plugin path successfully resolved for validation', {
      context: 'PluginValidator',
      pluginDirectoryPath: pluginDirectoryPath,
      pluginName: pluginName
    });
  } catch (error) {
    logger.error('Failed to resolve plugin path for validation', {
      context: 'PluginValidator',
      pluginIdentifier: pluginIdentifier,
      error: error.message
    });
    return { isValid: false, errors: [error.message], warnings: [] };
  }

  const pluginMetadata = getPluginMetadata(pluginDirectoryPath, pluginName, warnings);

  // Ensure plugin_name derived from metadata matches the directory name for core consistency
  if (pluginMetadata.plugin_name.value !== pluginName) {
    const nameMismatchError = `Resolved 'plugin_name' ('${pluginMetadata.plugin_name.value}') does not match plugin directory name ('${pluginName}'). This is a critical mismatch.`;
    logger.error('✗ Plugin is INVALID: Plugin name mismatch', {
      context: 'PluginValidator',
      resolvedPluginName: pluginMetadata.plugin_name.value,
      directoryName: pluginName,
      error: nameMismatchError
    });
    errors.push(nameMismatchError);
    return {
      isValid: false,
      errors: errors,
      warnings: warnings
    };
  }
  logger.debug('Plugin name matches directory name', {
    context: 'PluginValidator',
    pluginName: pluginName
  });


  let validationResult;
  switch (pluginMetadata.protocol.value.toLowerCase()) {
  case 'v1':
    logger.info('Delegating validation to V1 protocol validator', {
      context: 'PluginValidator',
      protocol: 'v1',
      pluginName: pluginName
    });
    validationResult = v1Validator.validateV1(pluginDirectoryPath, pluginMetadata);
    break;
  default:
  {
    const errorMsg = `Unsupported plugin protocol '${pluginMetadata.protocol.value}' for plugin '${pluginName}'.`;
    logger.error('✗ Plugin is INVALID: Unsupported protocol', {
      context: 'PluginValidator',
      pluginName: pluginName,
      protocol: pluginMetadata.protocol.value,
      error: errorMsg
    });
    errors.push(errorMsg);
    validationResult = { isValid: false, errors: [errorMsg], warnings: [] };
    break;
  }
  }

  // Merge warnings from internal validation steps
  validationResult.warnings = [...warnings, ...validationResult.warnings];
  // Final validity is true only if no errors accumulated anywhere
  validationResult.isValid = validationResult.isValid && (errors.length === 0);

  logger.validation('--- Validation Summary ---', {
    //context: 'PluginValidator',
    pluginName: pluginName,
    isValid: validationResult.isValid,
    errorCount: validationResult.errors.length,
    warningCount: validationResult.warnings.length

  });
  if (validationResult.isValid) {
    if (validationResult.warnings.length === 0) {
      logger.success(`✓ Plugin '${pluginName}' is VALID.`, {
        context: 'PluginValidator',
        pluginName: pluginName,
        status: 'valid'
      });
    } else {
      logger.warn('Plugin is usable with warnings', {
        context: 'PluginValidator',
        pluginName: pluginName,
        status: 'valid_with_warnings',
        warningCount: validationResult.warnings.length
      });
    }
  } else {
    logger.error('Plugin is invalid', { // No symbol here, matches current example output
      context: 'PluginValidator',
      pluginName: pluginName,
      status: 'invalid',
      errorCount: validationResult.errors.length
    });
  }

  if (validationResult.errors.length > 0) {
    logger.error('Errors found during validation:', {
      context: 'PluginValidator',
      pluginName: pluginName,
      errorCount: validationResult.errors.length
    });
    validationResult.errors.forEach((error) => {
      logger.error(`✗ ${error}`, {
        context: 'PluginValidator',
        pluginName: pluginName,
        format: 'inline_list_item'
      });
    });
  }

  if (validationResult.warnings.length > 0) {
    logger.warn('Warnings found during validation:', {
      context: 'PluginValidator',
      pluginName: pluginName,
      warningCount: validationResult.warnings.length
    });
    validationResult.warnings.forEach((warning) => {
      logger.warn(`○ ${warning}`, {
        context: 'PluginValidator',
        pluginName: pluginName,
        format: 'inline_list_item'
      });
    });
  } else if (validationResult.isValid) {
    logger.validation('No warnings found.', {
      //context: 'PluginValidator',
      pluginName: pluginName
    });
  }

  return validationResult;
}

module.exports = { validate };
