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
        describe: `source to archetype from ('collection/id' or path)`,
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
      return;
    }

    if (!args.manager || typeof args.manager.archetypePlugin !== 'function') {
      console.error(chalk.red('ERROR: CollectionsManager or its archetypePlugin method is not available. This is an internal setup issue.'));
      process.exit(1);
      return;
    }
    
    if (!args.configResolver) {
        console.error(chalk.red('ERROR (createCmd): ConfigResolver instance not available in createCmd handler. This is a critical internal error.'));
        process.exit(1);
    }

    let sourceIdentifier;
    let targetDirOptionForArchetype;

    try {
      if (args.from) {
        const configResolver = args.configResolver; 
        await configResolver._initializeResolverIfNeeded();

        const pluginRegistryEntry = configResolver.mergedPluginRegistry[args.from];

        if (pluginRegistryEntry && pluginRegistryEntry.configPath) {
          sourceIdentifier = path.dirname(pluginRegistryEntry.configPath);
        } else {
          sourceIdentifier = args.from;
        }

        targetDirOptionForArchetype = args.targetDir ? path.resolve(args.targetDir) : undefined;
        console.log(chalk.blue(`Attempting to create plugin '${chalk.yellow(newPluginName)}' by archetyping from source '${chalk.cyan(args.from)}'...`));

      } else {
        const templateName = 'template-basic';
        sourceIdentifier = path.resolve(__dirname, '..', '..', '..', 'plugins', templateName);
        targetDirOptionForArchetype = args.targetDir ? path.resolve(args.targetDir) : path.resolve(process.cwd());
        console.log(chalk.blue(`Attempting to create plugin '${chalk.yellow(newPluginName)}' from bundled template '${chalk.cyan(templateName)}'...`));
      }

      if (targetDirOptionForArchetype && args.from) {
        console.log(chalk.blue(`  Target base directory specified: ${chalk.underline(targetDirOptionForArchetype)}`));
      } else if (targetDirOptionForArchetype && !args.from) {
        console.log(chalk.blue(`  Target base directory (for template): ${chalk.underline(targetDirOptionForArchetype)}`));
      } else if (args.from && !args.targetDir) {
        console.log(chalk.blue(`  No target base directory specified, will use default for archetypes (e.g., ~/.local/share/md-to-pdf/my-plugins/).`));
      }

      const optionsForArchetype = {
        targetDir: targetDirOptionForArchetype,
        force: args.force
      };

      const result = await args.manager.archetypePlugin(sourceIdentifier, newPluginName, optionsForArchetype);

      if (result && result.success && result.archetypePath) {
        console.log(chalk.greenBright(`\nPlugin '${chalk.yellow(newPluginName)}' created successfully.`));
        console.log(chalk.blueBright("Next steps:"));
        console.log(chalk.gray(`  1. Customize the generated files in: ${chalk.underline(result.archetypePath)}`));
        console.log(chalk.gray(`  2. Register your new plugin in a main md-to-pdf configuration file (e.g., ~/.config/md-to-pdf/config.yaml or a project config):`));
        console.log(chalk.gray(  "     plugins:"));
        console.log(chalk.gray(`       ${newPluginName}: "${path.join(result.archetypePath, `${newPluginName}.config.yaml`)}"`));
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
          !(error.message && error.message.toLowerCase().includes('target archetype directory')) &&
          !(error.message && error.message.toLowerCase().includes('not found')) &&
          !(error.message && error.message.toLowerCase().includes('invalid plugin name'))) {
          console.error(chalk.red(error.stack));
      }
      process.exit(1);
    }
  }
};
