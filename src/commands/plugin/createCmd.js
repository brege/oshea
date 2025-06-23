// src/commands/plugin/createCmd.js
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const { isValidPluginName } = require('../../collections-manager/cm-utils');

module.exports = {
  command: 'create <pluginName>',
  describe: 'create a new plugin from template or existing plugin',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'name for the new plugin',
        type: 'string'
      })
      .option('from', {
        describe: `source to archetype from (registered plugin name, 'collection/id', or path)`,
        type: 'string',
        alias: 'f'
      })
      .option('target-dir', {
        alias: 't',
        describe: `directory to create the new plugin in`,
        type: 'string',
        normalize: true
      })
      .option('force', {
        describe: 'overwrite target directory if it exists',
        type: 'boolean',
        default: false
      })
      .epilogue(`If --from is omitted, a default template is used.\nIf --target-dir is omitted, defaults to the current directory.`);
  },
  handler: async (args) => {
    const newPluginName = args.pluginName;

    if (!isValidPluginName(newPluginName)) {
      console.error(chalk.red(`ERROR: Invalid plugin name: "${newPluginName}". Name must be alphanumeric and can contain hyphens, but not start or end with them, and no underscores.`));
      process.exit(1);
    }

    if (!args.manager || typeof args.manager.archetypePlugin !== 'function' || !args.configResolver) {
      console.error(chalk.red('ERROR: Manager or ConfigResolver not available. This is an internal setup issue.'));
      process.exit(1);
    }
    
    try {
      let sourceIdentifier;

      if (args.from) {
        const configResolver = args.configResolver; 
        await configResolver._initializeResolverIfNeeded();
        const pluginRegistryEntry = configResolver.mergedPluginRegistry[args.from];

        if (pluginRegistryEntry && pluginRegistryEntry.configPath) {
          sourceIdentifier = path.dirname(pluginRegistryEntry.configPath);
        } else {
          sourceIdentifier = args.from;
        }
      } else {
        // CORRECTED: The path was off by one directory level. Added one '..'
        sourceIdentifier = path.resolve(__dirname, '..', '..', '..', 'plugins', 'template-basic');
      }

      const options = {
        targetDir: args.targetDir,
        force: args.force
      };

      const result = await args.manager.archetypePlugin(sourceIdentifier, newPluginName, options);

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`\nPlugin '${chalk.yellow(newPluginName)}' created successfully.`));
        console.log(chalk.blueBright("Next steps:"));
        console.log(chalk.gray(`  1. Customize the generated files in: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.gray(`  2. Register your new plugin in a main config file.`));
      }

    } catch (error) {
      console.error(chalk.red(`\nERROR during 'plugin create ${newPluginName}': ${error.message}`));
      process.exit(1);
    }
  }
};
