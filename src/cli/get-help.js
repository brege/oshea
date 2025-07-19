// src/cli/get-help.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const { markdownUtilsPath, pluginRegistryBuilderPath, loggerPath  } = require('@paths');
const { extractFrontMatter } = require(markdownUtilsPath);
const logger = require(loggerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const yaml = require('js-yaml');

async function displayPluginHelp(pluginName, manager, cliArgs) {

  logger.info(`Attempting to display help for plugin: ${pluginName}`);

  try {
    const { projectRoot } = require('@paths');
    const registryBuilder = new PluginRegistryBuilder(
      projectRoot,
      null,
      cliArgs.config,
      cliArgs.factoryDefaults,
      false,
      null,
      manager,
      { collRoot: manager.collRoot }
    );

    const pluginRegistry = await registryBuilder.buildRegistry();
    const pluginRegistration = pluginRegistry[pluginName];

    if (!pluginRegistration || !pluginRegistration.configPath) {
      logger.error(`Plugin "${pluginName}" not found or not properly registered.`);
      logger.info('You can list available plugins using: md-to-pdf plugin list');
      return;
    }

    const pluginBasePath = path.dirname(pluginRegistration.configPath);
    const readmePath = path.join(pluginBasePath, 'README.md');

    if (!fss.existsSync(readmePath)) {
      logger.warn(`WARN: README.md not found for plugin "${pluginName}" at ${readmePath}.`);
      logger.info('No specific help available. Description from config:');
      try {
        const pluginConfigContent = await fs.readFile(pluginRegistration.configPath, 'utf8');
        const pluginConfig = yaml.load(pluginConfigContent);
        if (pluginConfig && pluginConfig.description) {
          logger.info(`  ${pluginConfig.description}`);
        } else {
          logger.info('  No description found in plugin\'s config file either.');
        }
      } catch {
        logger.info('  Could not load plugin description.');
      }
      return;
    }

    const readmeContent = await fs.readFile(readmePath, 'utf8');
    const { data: frontMatter } = extractFrontMatter(readmeContent);

    if (frontMatter && frontMatter.cli_help) {
      logger.info('\n--- Plugin Help ---\n');
      logger.info(frontMatter.cli_help.trim());
      logger.info('\n-------------------\n');
    } else {
      logger.warn(`WARN: No 'cli_help' section found in the front matter of README.md for plugin "${pluginName}".`);
      logger.info('Displaying plugin description from its configuration file as fallback:');
      try {
        const pluginConfigContent = await fs.readFile(pluginRegistration.configPath, 'utf8');
        const pluginConfig = yaml.load(pluginConfigContent);
        if (pluginConfig && pluginConfig.description) {
          logger.info(`  ${pluginConfig.description}`);
        } else {
          logger.info('  No description found in plugin\'s config file.');
        }
      } catch {
        logger.info('  Could not load plugin description.');
      }
    }

  } catch (error) {
    logger.error(`Could not retrieve help for plugin "${pluginName}": ${error.message}`);
    if (error.stack && !(cliArgs.watch)) logger.error(error.stack);
  }
}

module.exports = {
  displayPluginHelp,
};
