#!/usr/bin/env node

// collections-manager-cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const CollectionsManager = require('./index.js');
const path = require('path');
const chalk = require('chalk');

const manager = new CollectionsManager({ debug: process.env.DEBUG_CM === 'true' });

yargs(hideBin(process.argv))
  .scriptName("md-to-pdf-cm")
  .usage(`Usage: ${chalk.yellow('$0')} <command> [options]`)
  .command(
    'add <url_or_path>',
    `Adds a new plugin collection from a URL or local path. Collections are stored in ${chalk.dim(manager.determineCollRoot())}`,
    (yargsCmd) => {
      yargsCmd
        .positional('url_or_path', {
          describe: 'The URL (e.g., Git repository) or local filesystem path to the plugin collection.',
          type: 'string',
          demandOption: true,
        })
        .option('name', {
          alias: 'n',
          describe: 'Optional. A specific local name for this collection within COLL_ROOT. If not provided, a name will be derived.',
          type: 'string'
        });
    },
    async (argv) => {
      console.log(chalk.blueBright(`Collections Manager CLI: Attempting to add collection...`));
      console.log(`  Source: ${chalk.cyan(argv.url_or_path)}`);
      if (argv.name) {
        console.log(`  Requested local name: ${chalk.yellow(argv.name)}`);
      }
      try {
        const resultPath = await manager.addCollection(argv.url_or_path, { name: argv.name });
        if (resultPath) {
            console.log(chalk.green(`\nCollection '${chalk.bold(path.basename(resultPath))}' added to:\n    ${chalk.underline(resultPath)}\n`));
            console.log(chalk.blueBright("To list its plugins, use:"));
            console.log(chalk.gray(`    md-to-pdf-cm list available ${path.basename(resultPath)}`));
            console.log(chalk.blueBright("\nTo activate plugins from this collection, use (example):"));
            console.log(chalk.gray(`    md-to-pdf-cm enable ${path.basename(resultPath)}/<plugin_id_from_list_available> [--as <your_invoke_name>]`));
        } else {
            console.error(chalk.red('Failed to add collection. See previous error messages.'));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR in 'add' command: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
        process.exit(1);
      }
    }
  )
  .command(
    'enable <collectionPluginId>',
    'Enables a plugin from a downloaded collection for use with md-to-pdf.',
    (yargsCmd) => {
      yargsCmd
        .positional('collectionPluginId', {
          describe: 'The identifier for the plugin to enable, in "collection_name/plugin_id" format.',
          type: 'string',
          demandOption: true,
        })
        .option('as', {
          describe: 'Optional. An alternative "invoke_name" to register the plugin under. Defaults to the plugin_id.',
          type: 'string'
        });
    },
    async (argv) => {
      console.log(chalk.blueBright(`Collections Manager CLI: Attempting to enable plugin...`));
      console.log(`  Plugin Identifier: ${chalk.cyan(argv.collectionPluginId)}`);
      if (argv.as) {
        console.log(`  Requested invoke name: ${chalk.yellow(argv.as)}`);
      }
      try {
        const result = await manager.enablePlugin(argv.collectionPluginId, { as: argv.as });
        if (result && result.success) {
            console.log(chalk.blueBright(`\nTo use this plugin with md-to-pdf, invoke it as: `) + chalk.gray(`md-to-pdf convert ... --plugin ${result.invoke_name || argv.as || argv.collectionPluginId.split('/')[1]}`));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR in 'enable' command: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
        process.exit(1);
      }
    }
  )
  .command(
    'disable <invoke_name>',
    'Disables an active plugin by removing it from the enabled manifest.',
    (yargsCmd) => {
      yargsCmd
        .positional('invoke_name', {
          describe: 'The current "invoke_name" of the plugin to disable.',
          type: 'string',
          demandOption: true,
        });
    },
    async (argv) => {
      console.log(chalk.blueBright(`Collections Manager CLI: Attempting to disable plugin...`));
      console.log(`  Plugin Invoke Name: ${chalk.cyan(argv.invoke_name)}`);
      try {
        const result = await manager.disablePlugin(argv.invoke_name);
        if (result && result.success) {
          console.log(chalk.blueBright(`Plugin "${argv.invoke_name}" is now disabled.`));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR in 'disable' command: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
        process.exit(1);
      }
    }
  )
  .command(
    'remove <collection_name>',
    'Removes a downloaded plugin collection. Use --force to also disable its plugins.',
    (yargsCmd) => {
      yargsCmd
        .positional('collection_name', {
          describe: 'The name of the collection to remove.',
          type: 'string',
          demandOption: true,
        })
        .option('force', {
          alias: 'f',
          describe: 'Forcibly remove the collection, automatically disabling any of its enabled plugins first.',
          type: 'boolean',
          default: false
        });
    },
    async (argv) => {
      console.log(chalk.blueBright(`Collections Manager CLI: Attempting to remove collection...`));
      console.log(`  Collection Name: ${chalk.cyan(argv.collection_name)}`);
      if (argv.force) {
        console.log(chalk.yellow('  Force option is enabled. Will attempt to disable plugins from this collection first.'));
      }
      try {
        const result = await manager.removeCollection(argv.collection_name, { force: argv.force });
        // Success/failure messages are already printed by removeCollection in CollectionsManager
        if (result && result.success) {
          console.log(chalk.blueBright(`Collection "${argv.collection_name}" has been removed.`));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR in 'remove' command: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
        process.exit(1);
      }
    }
  )
  .command(
    'list [type] [<collection_name>]',
    'Lists plugin collections or plugins. Types: downloaded, available, enabled.',
    (yargsCmd) => {
        yargsCmd
            .positional('type', {
                describe: `Type of listing: ${chalk.green('downloaded')}, ${chalk.green('available')}, ${chalk.green('enabled')}`,
                type: 'string',
                default: 'downloaded',
                choices: ['downloaded', 'available', 'enabled'] 
            })
            .positional('collection_name', {
                describe: `Optional. Name of the collection to list plugins from (for "${chalk.green('available')}" or "${chalk.green('enabled')}" types).`,
                type: 'string'
            });
    },
    async (argv) => {
        if (argv.type === 'downloaded' && argv.collection_name) {
             console.warn(chalk.yellow(`WARN: Specifying a collection name for 'list downloaded' has no effect. It lists all downloaded collections.`));
        }
        try {
            await manager.listCollections(argv.type, argv.collection_name);
        } catch (error) {
            console.error(chalk.red(`ERROR in 'list' command: ${error.message}`));
            if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
            process.exit(1);
        }
    }
  )
  .demandCommand(1, chalk.red('You must provide a command (e.g., add, list, enable, disable, remove).'))
  .help()
  .alias('h', 'help')
  .strict()
  .wrap(process.stdout.columns || null)
  .parse();
