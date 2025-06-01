// src/commands/collection/archetypeCmd.js
const chalk = require('chalk');
const path = require('path'); // Required if we make it functional for one last time

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
      .option('target-dir', {
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
    console.warn(chalk.yellow.bold(`Please use: md-to-pdf plugin create ${args.newArchetypeName} --from "${args.sourcePluginIdentifier}" ${args.targetDir ? '--dir "'+args.targetDir+'"' : ''} ${args.force ? '--force' : ''}\n`));

    if (!args.manager || typeof args.manager.archetypePlugin !== 'function') {
      console.error(chalk.red('ERROR: CollectionsManager or its archetypePlugin method is not available. This is an internal setup issue.'));
      process.exit(1);
      return;
    }

    // For v0.8.5, we'll allow it to function with the warning.
    // In a future version, this call would be removed.
    try {
      const result = await args.manager.archetypePlugin(args.sourcePluginIdentifier, args.newArchetypeName, {
        targetDir: args.targetDir, // Pass it along; archetypePlugin handles its own default if this is undefined
        force: args.force
      });

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`(Legacy) Archetype '${chalk.yellow(args.newArchetypeName)}' created successfully.`));
        console.log(chalk.gray(`  Files located at: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.blueBright("  Remember to register it for general use:"));
        console.log(chalk.gray(  "    plugins:"));
        console.log(chalk.gray(`      ${args.newArchetypeName}: "${path.join(result.archetypePath, `${args.newArchetypeName}.config.yaml`)}"`));
      } else {
        console.error(chalk.red(`(Legacy) Archetype creation failed. ${result ? result.message : 'An unknown error occurred.'}`));
        // No process.exit(1) here if archetypePlugin itself handles logging and doesn't throw for common issues
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR during legacy 'collection archetype' execution: ${error.message}`));
      // No process.exit(1) here to allow deprecation message to be primary output if error is from CM logic
    }
  }
};
