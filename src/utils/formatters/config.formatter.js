// src/utils/formatters/config.formatter.js
// Configuration display formatter - handles both global and plugin config formatting
const yaml = require('js-yaml');
const path = require('path');
const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Format global configuration display
function formatGlobalConfig(level, message, meta = {}) {
  const { configData, sources, isPure = false } = meta;

  if (!configData) {
    console.log(theme.warn('No configuration data provided'));
    return;
  }

  if (!isPure) {
    // Display configuration sources header
    console.log(theme.info('# Configuration Sources:'));

    if (sources.mainConfigPath) {
      const sourceTypeMessage = formatSourceTypeMessage(sources);
      console.log(theme.detail(`#   Primary Main Config Loaded: ${sources.mainConfigPath} ${sourceTypeMessage}`));
    } else {
      console.log(theme.detail('#   Primary Main Config: (Using internal defaults as no file was loaded/found)'));
    }

    // Display considered paths
    if (!sources.useFactoryDefaultsOnly) {
      displayConsideredPaths(sources);
    }

    displayBundledConfigInfo(sources);
    console.log(theme.info('# Active Global Configuration:\n'));
  }

  // Output the configuration YAML
  const yamlOutput = yaml.dump(configData, {
    indent: 2,
    sortKeys: false,
    lineWidth: -1,
    noRefs: true
  });
  console.log(yamlOutput);

  if (!isPure) {
    console.log(theme.detail('\n# Note: This shows the global settings from the primary main configuration file.'));
    console.log(theme.detail('# To see the full effective configuration for a specific plugin, use \'md-to-pdf config --plugin <pluginName>\'.'));
  }
}

// Format plugin configuration display
function formatPluginConfig(level, message, meta = {}) {
  const { effectiveConfig, configSources, pluginName, isPure = false } = meta;

  if (!effectiveConfig) {
    console.log(theme.warn('No plugin configuration data provided'));
    return;
  }

  if (!isPure) {
    console.log(theme.info(`# Effective configuration for plugin: ${pluginName}\n`));
  }

  // Output the plugin-specific configuration YAML
  const yamlOutput = yaml.dump(effectiveConfig.pluginSpecificConfig, {
    indent: 2,
    sortKeys: true,
    lineWidth: -1,
    noRefs: true
  });
  console.log(yamlOutput);

  if (!isPure) {
    displayPluginSourceInfo(effectiveConfig, configSources);
    displayResolvedCssFiles(effectiveConfig);
  }
}

// Helper: Format source type message for main config
function formatSourceTypeMessage(sources) {
  const { useFactoryDefaultsOnly, loadReason, mainConfigPath } = sources;

  if (useFactoryDefaultsOnly && loadReason === 'factory default') {
    return `(Factory Default: ${path.basename(mainConfigPath)})`;
  } else if (loadReason === 'project (from --config)') {
    return '(Project --config)';
  } else if (loadReason === 'XDG global') {
    return '(XDG Global)';
  } else if (loadReason === 'bundled main') {
    return `(Bundled Main: ${path.basename(mainConfigPath)})`;
  } else if (loadReason === 'factory default fallback') {
    return `(Factory Default Fallback: ${path.basename(mainConfigPath)})`;
  } else if (loadReason) {
    return `(${loadReason})`;
  }
  return '';
}

// Helper: Display considered configuration paths
function displayConsideredPaths(sources) {
  const { mainConfigPath, xdgConfigDetails, projectConfigDetails } = sources;

  if (projectConfigDetails?.path && projectConfigDetails.pathExists && projectConfigDetails.path !== mainConfigPath) {
    console.log(theme.detail(`#   Considered Project Manifest (--config): ${projectConfigDetails.path}`));
  }

  if (xdgConfigDetails?.path && xdgConfigDetails.pathExists &&
      xdgConfigDetails.path !== mainConfigPath &&
      (!projectConfigDetails?.path || projectConfigDetails.path !== xdgConfigDetails.path)) {
    console.log(theme.detail(`#   Considered XDG Global Config: ${xdgConfigDetails.path}`));
  }
}

// Helper: Display bundled config information
function displayBundledConfigInfo(sources) {
  const { bundledMainDefaultPath, mainConfigPath, factoryDefaultMainConfigPath } = sources;

  if (bundledMainDefaultPath && bundledMainDefaultPath.exists &&
      bundledMainDefaultPath.path !== mainConfigPath &&
      mainConfigPath !== factoryDefaultMainConfigPath) {
    console.log(theme.detail(`#   Considered Bundled Main Config (${path.basename(bundledMainDefaultPath.path)}): ${bundledMainDefaultPath.path}`));
  }
}

// Helper: Display plugin source information
function displayPluginSourceInfo(effectiveConfig, configSources) {
  console.log(theme.info('\n# Source Information:'));
  console.log(theme.detail(`#   Plugin Base Path: ${effectiveConfig.pluginBasePath}`));
  console.log(theme.detail(`#   Handler Script Path: ${effectiveConfig.handlerScriptPath}`));

  console.log(theme.detail('#   Contributing Configuration Files (most specific last):'));
  if (configSources.mainConfigPath) {
    console.log(theme.detail(`#     - Primary Main Config (for global settings): ${configSources.mainConfigPath}`));
  }
  configSources.pluginConfigPaths.forEach(p =>
    console.log(theme.detail(`#     - ${p}`))
  );
}

// Helper: Display resolved CSS files
function displayResolvedCssFiles(effectiveConfig) {
  console.log(theme.info('\n# Resolved CSS Files (order matters):'));

  if (effectiveConfig.pluginSpecificConfig.css_files &&
      effectiveConfig.pluginSpecificConfig.css_files.length > 0) {
    effectiveConfig.pluginSpecificConfig.css_files.forEach(p =>
      console.log(theme.detail(`#     - ${p}`))
    );
  } else {
    console.log(theme.detail('#     (No CSS files resolved for this plugin configuration)'));
  }
}

module.exports = {
  formatGlobalConfig,
  formatPluginConfig,
  formatSourceTypeMessage,
  displayConsideredPaths,
  displayBundledConfigInfo,
  displayPluginSourceInfo,
  displayResolvedCssFiles
};