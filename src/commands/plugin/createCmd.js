// src/commands/plugin/createCmd.js
const path = require('path');
const chalk = require('chalk');
const fs = require('fs'); // For fs.existsSync

// const { scaffoldPlugin } = require('../../plugin_scaffolder'); // No longer needed

module.exports = {
  command: 'create <pluginName>',
  describe: 'Create a new plugin boilerplate from a template, or archetype from an existing plugin.',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'Name for the new plugin (e.g., my-custom-plugin).',
        type: 'string'
      })
      .option('from', {
        describe: `Optional. The source to create the plugin from.
                   Can be a CM-managed plugin identifier ('collection_name/plugin_id')
                   or a direct filesystem path to an existing plugin directory.
                   If omitted, a default bundled template will be used.`,
        type: 'string',
        alias: 'f'
      })
      .option('dir', {
        describe: `Optional. The base directory in which to create the new plugin's folder ('<pluginName>').
                   - If --from is NOT used (creating from template): Defaults to the current working directory (e.g., './<pluginName>').
                   - If --from IS used (archetyping an existing plugin): Defaults to a user-specific plugins directory (e.g., '~/.local/share/md-to-pdf/my-plugins/'). This default is handled by the underlying archetype command if --dir is omitted.`,
        type: 'string',
        normalize: true
      })
      .option('force', {
        describe: 'Overwrite existing plugin directory if it exists.',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    if (!args.manager || typeof args.manager.archetypePlugin !== 'function') {
      console.error(chalk.red('ERROR: CollectionsManager or its archetypePlugin method is not available. This is an internal setup issue.'));
      process.exit(1);
      return;
    }

    const newPluginName = args.pluginName;
    let sourceIdentifier;
    let targetDirOptionForArchetype; // This will be passed to archetypePlugin

    try {
      if (args.from) {
        sourceIdentifier = args.from;
        // If --dir is given, resolve it. If not, pass undefined so archetypePlugin uses its default for "from existing".
        targetDirOptionForArchetype = args.dir ? path.resolve(args.dir) : undefined;
        console.log(chalk.blue(`Attempting to create plugin '${chalk.yellow(newPluginName)}' by archetyping from source '${chalk.cyan(sourceIdentifier)}'...`));
      } else {
        // Default to bundled 'template-basic'
        const templateName = 'template-basic';
        // __dirname is src/commands/plugin, so ../../.. gets to project root
        sourceIdentifier = path.resolve(__dirname, '..', '..', '..', 'plugins', templateName);
        // If --dir is not specified when creating from template, default target base to CWD.
        // The new plugin will be <CWD>/<newPluginName>.
        targetDirOptionForArchetype = args.dir ? path.resolve(args.dir) : path.resolve(process.cwd());
        console.log(chalk.blue(`Attempting to create plugin '${chalk.yellow(newPluginName)}' from bundled template '${chalk.cyan(templateName)}'...`));
        if (process.env.DEBUG_CM === 'true' || !args.from) { // Show template path if debugging or using template
             console.log(chalk.gray(` (Template source resolved to: ${sourceIdentifier})`));
        }
      }

      if (targetDirOptionForArchetype && args.from) { // Only log if --dir was specified for --from case
        console.log(chalk.blue(`  Target base directory specified: ${chalk.underline(targetDirOptionForArchetype)}`));
      } else if (targetDirOptionForArchetype && !args.from) { // Always log for template case if targetDir is determined
        console.log(chalk.blue(`  Target base directory (for template): ${chalk.underline(targetDirOptionForArchetype)}`));
      } else if (args.from && !args.dir) { // --from used, but no --dir, so archetype's default kicks in
        console.log(chalk.blue(`  No target base directory specified, will use default for archetypes (e.g., ~/.local/share/md-to-pdf/my-plugins/).`));
      }


      const optionsForArchetype = {
        targetDir: targetDirOptionForArchetype, // This is the base directory for the new plugin folder
        force: args.force
      };

      const result = await args.manager.archetypePlugin(sourceIdentifier, newPluginName, optionsForArchetype);

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`\nPlugin '${chalk.yellow(newPluginName)}' created successfully.`));
        console.log(chalk.blueBright("Next steps:"));
        console.log(chalk.gray(`  1. Customize the generated files in: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.gray(`  2. Register your new plugin in a main md-to-pdf configuration file (e.g., ~/.config/md-to-pdf/config.yaml or a project config):`));
        console.log(chalk.gray(  "     plugins:"));
        console.log(chalk.gray(`       ${newPluginName}: "${path.join(result.archetypePath, `${newPluginName}.config.yaml`)}"`)); // Use path.join for platform independence
        console.log(chalk.gray(`  3. Test with: md-to-pdf convert your_doc.md --plugin ${newPluginName}`));

        const exampleMdPath = path.join(result.archetypePath, `${newPluginName}-example.md`);
        if (fs.existsSync(exampleMdPath)) {
            console.log(chalk.gray(`\n     An example Markdown file was created: ${chalk.underline(exampleMdPath)}`));
            console.log(chalk.gray(`     Try running from within '${chalk.underline(result.archetypePath)}': md-to-pdf ${newPluginName}-example.md`));
        }

      } else {
        console.error(chalk.red(`Plugin creation failed. ${result ? result.message : 'An unknown error occurred with archetypePlugin.'}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\nERROR during 'plugin create ${newPluginName}': ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack && 
          !(error.message && error.message.toLowerCase().includes('target archetype directory')) && // Don't show stack for common, clear errors
          !(error.message && error.message.toLowerCase().includes('not found'))) {
          console.error(chalk.red(error.stack));
      }
      process.exit(1);
    }
  }
};
