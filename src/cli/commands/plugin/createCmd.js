// src/cli/commands/plugin/createCmd.js
const path = require('path');
const chalk = require('chalk');
const { isValidPluginName } = require('../../../collections/cm-utils');
const { createArchetype } = require('../../../plugins/plugin_archetyper');

// Dependencies required by the archetyper logic
const fs = require('fs').promises;
const fss = require('fs');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const matter = require('gray-matter');
const cmUtils = require('../../../collections/cm-utils');
const constants = require('../../../collections/constants');


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
        alias: 'f',
        completionKey: 'usablePlugins' 
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
      console.error(chalk.red(`ERROR: Invalid plugin name: "${newPluginName}".`));
      process.exit(1);
    }

    if (!args.manager || !args.configResolver) {
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
        sourceIdentifier = path.resolve(__dirname, '..', '..', '..', '..', 'plugins', 'template-basic');
      }

      const options = {
        targetDir: args.targetDir,
        force: args.force
      };

      // Assemble the dependencies and context for the new archetyper function
      const dependencies = { chalk, cmUtils, constants, fs, fss, fsExtra, yaml, matter, path };
      
      const managerContext = {
        collRoot: args.manager.collRoot,
        debug: args.manager.debug,
        listAvailablePlugins: args.manager.listAvailablePlugins.bind(args.manager)
      };

      // This is the single logical change: calling the new decoupled function.
      const result = await createArchetype(dependencies, managerContext, sourceIdentifier, newPluginName, options);

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`\nPlugin '${chalk.yellow(newPluginName)}' created successfully.`));
        console.log(chalk.blueBright("Next steps:"));
        console.log(chalk.gray(`  1. Customize the generated files in: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.gray(`  2. Register your new plugin in a main config file.`));
      }
      
      const cliPath = path.resolve(__dirname, '../../../../cli.js'); 
      const cliPath = path.resolve(__dirname, '../../../cli.js');
      try {
        const { execSync } = require('child_process');
        execSync(`node "${cliPath}" _tab_cache`);
      } catch (error) {                                                                                 
        console.error(chalk.yellow(`WARN: Failed to regenerate completion cache. This is not a fatal error.`));                                                                                                 
      }   

    } catch (error) {
      console.error(chalk.red(`\nERROR during 'plugin create ${newPluginName}': ${error.message}`));
      process.exit(1);
    }
  }
};
