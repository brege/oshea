// src/commands/collection/archetypeCmd.js
const chalk = require('chalk');
const path = require('path'); 

module.exports = {
  command: 'archetype <sourcePluginIdentifier> <newArchetypeName>',
  describe: chalk.yellow('[DEPRECATED] Creates an archetype of an existing plugin. Please use "md-to-pdf plugin create <newArchetypeName> --from <sourcePluginIdentifier>" instead.'),
  builder: (yargsCmd) => {
    yargsCmd
      .positional('sourcePluginIdentifier', {
        describe: 'The identifier for the source plugin, in "collection_name/plugin_id" format or a direct path.',
        type: 'string',
        demandOption: true,
      })
      .positional('newArchetypeName', {
        describe: 'The name for the new archetyped plugin.',
        type: 'string',
        demandOption: true,
      })
      .option('target-dir', { // Ensure this option is defined for the command
        alias: 't',
        describe: `Optional. Specifies the base directory for the new archetype.
                   If using a CM-managed source and this is omitted, defaults to a user-specific directory (e.g., ~/.local/share/md-to-pdf/my-plugins/).
                   If using a direct path source (like for templates) and this is omitted, the 'plugin create' command handles defaulting to CWD.`,
        type: 'string',
        normalize: true
      })
      .option('force', {
        describe: 'Overwrite existing archetype directory if it exists.',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    console.warn(chalk.yellow.bold('Warning: The "collection archetype" command is deprecated and will be removed in a future version.'));
    // Corrected to use args.targetDir which yargs normalizes from --target-dir
    console.warn(chalk.yellow.bold(`Please use: md-to-pdf plugin create ${args.newArchetypeName} --from "${args.sourcePluginIdentifier}" ${args.targetDir ? '--dir "'+args.targetDir+'"' : ''} ${args.force ? '--force' : ''}\n`));

    if (!args.manager || typeof args.manager.archetypePlugin !== 'function') {
      console.error(chalk.red('ERROR: CollectionsManager or its archetypePlugin method is not available. This is an internal setup issue.'));
      process.exit(1);
      return;
    }

    try {
      const result = await args.manager.archetypePlugin(args.sourcePluginIdentifier, args.newArchetypeName, {
        targetDir: args.targetDir, 
        force: args.force
      });

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`(Legacy) Archetype '${chalk.yellow(args.newArchetypeName)}' created successfully.`));
        console.log(chalk.gray(`  Files located at: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.blueBright("  Remember to register it for general use:"));
        console.log(chalk.gray(  "    plugins:"));
        console.log(chalk.gray(`      ${args.newArchetypeName}: "${path.join(result.archetypePath, `${args.newArchetypeName}.config.yaml`)}"`));
      } else {
        if (result && result.message && !result.message.toLowerCase().includes("target archetype directory")) {
             console.error(chalk.red(`(Legacy) Archetype creation failed. ${result.message}`));
        } else if (!result) {
             console.error(chalk.red(`(Legacy) Archetype creation failed. An unknown error occurred with archetypePlugin.`));
        }
      }
    } catch (error) {
      if (!error.message.toLowerCase().includes("target archetype directory") && !error.message.toLowerCase().includes("not found")) {
         console.error(chalk.red(`\nERROR during legacy 'collection archetype' execution: ${error.message}`));
      }
    }
  }
};
