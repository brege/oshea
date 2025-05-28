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
            console.log(chalk.blueBright("\nOr to activate all plugins from this collection (example):"));
            console.log(chalk.gray(`    md-to-pdf-cm enable ${path.basename(resultPath)} --all [--prefix <your_prefix_>]`));
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
    'enable <target>', // Changed positional to <target>
    'Enables a plugin or all plugins from a collection.',
    (yargsCmd) => {
      yargsCmd
        .positional('target', {
          describe: 'The plugin to enable ("collection_name/plugin_id") OR the collection name (if using --all).',
          type: 'string',
          demandOption: true,
        })
        .option('as', {
          describe: 'Optional. An alternative "invoke_name" to register the plugin under (only for single plugin enablement).',
          type: 'string'
        })
        .option('all', {
          describe: 'Enable all available plugins from the specified collection name.',
          type: 'boolean',
          default: false
        })
        .option('prefix', {
          describe: 'Optional. A prefix string for invoke names when using --all.',
          type: 'string'
        });
    },
    async (argv) => {
      if (argv.all) {
        console.log(chalk.blueBright(`Collections Manager CLI: Attempting to enable all plugins in collection...`));
        console.log(`  Collection Name: ${chalk.cyan(argv.target)}`);
        if (argv.prefix) {
          console.log(`  Using prefix for invoke names: ${chalk.yellow(argv.prefix)}`);
        }
        try {
          const result = await manager.enableAllPluginsInCollection(argv.target, { prefix: argv.prefix });
          // enableAllPluginsInCollection already logs details.
          if (result && result.success) {
            console.log(chalk.green(`\nSuccessfully processed enabling all plugins from "${argv.target}". Check details above.`));
          } else {
            console.warn(chalk.yellow(`\nFinished processing enable all for "${argv.target}" with some issues. Check details above.`));
          }
        } catch (error) {
          console.error(chalk.red(`\nERROR in 'enable --all' command: ${error.message}`));
          if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
          process.exit(1);
        }
      } else {
        console.log(chalk.blueBright(`Collections Manager CLI: Attempting to enable plugin...`));
        console.log(`  Plugin Identifier: ${chalk.cyan(argv.target)}`);
        if (argv.as) {
          console.log(`  Requested invoke name: ${chalk.yellow(argv.as)}`);
        }
        if (argv.prefix){
            console.warn(chalk.yellow("WARN: --prefix option is ignored when not using --all."))
        }
        try {
          const result = await manager.enablePlugin(argv.target, { as: argv.as });
          if (result && result.success) {
              console.log(chalk.blueBright(`\nTo use this plugin with md-to-pdf, invoke it as: `) + chalk.gray(`md-to-pdf convert ... --plugin ${result.invoke_name || argv.as || argv.target.split('/')[1]}`));
          }
        } catch (error) {
          console.error(chalk.red(`\nERROR in 'enable' command: ${error.message}`));
          if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
          process.exit(1);
        }
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
    'update [<collection_name>]',
    'Updates a Git-based plugin collection, or all Git-based collections if no name is specified.',
    (yargsCmd) => {
      yargsCmd
        .positional('collection_name', {
          describe: 'Optional. The name of the specific collection to update.',
          type: 'string'
        });
    },
    async (argv) => {
      if (argv.collection_name) {
        console.log(chalk.blueBright(`Collections Manager CLI: Attempting to update collection '${chalk.cyan(argv.collection_name)}'...`));
        try {
          const result = await manager.updateCollection(argv.collection_name);
          // updateCollection method already logs success/failure details
        } catch (error) {
          console.error(chalk.red(`\nERROR in 'update ${argv.collection_name}' command: ${error.message}`));
          if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
          process.exit(1);
        }
      } else {
        console.log(chalk.blueBright('Collections Manager CLI: Attempting to update all Git-based collections...'));
        try {
          const results = await manager.updateAllCollections();
          // updateAllCollections method already logs details
           results.messages.forEach(msg => console.log(chalk.blue(`  ${msg}`)));
           if (!results.success) {
             console.warn(chalk.yellow("Some collections may not have updated successfully. Check logs above."));
           }
        } catch (error) {
          console.error(chalk.red(`\nERROR in 'update all' command: ${error.message}`));
          if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
          process.exit(1);
        }
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
            const results = await manager.listCollections(argv.type, argv.collection_name);
            // Formatting and printing logic for 'list' command
            if (argv.type === 'downloaded') {
                if (results.length === 0) {
                    // Message already printed by manager.listCollections if COLL_ROOT doesn't exist or is empty
                } else {
                    console.log(chalk.blue("\nDownloaded plugin collections:"));
                    results.forEach(name => console.log(chalk.greenBright(`  - ${name}`)));
                }
            } else if (argv.type === 'available') {
                if (results.length === 0) {
                    console.log(chalk.yellow(`No available plugins found${argv.collection_name ? ` in collection "${argv.collection_name}"` : ''}.`));
                } else {
                    console.log(chalk.blue(`\nAvailable plugins${argv.collection_name ? ` in collection "${chalk.cyan(argv.collection_name)}"` : ''}:`));
                    results.forEach(p => {
                        console.log(chalk.greenBright(`  - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
                        console.log(chalk.gray(`    Collection: ${p.collection}`));
                        console.log(chalk.gray(`    Description: ${p.description}`));
                        console.log(chalk.gray(`    Config Path: ${p.config_path}`));
                    });
                }
            } else if (argv.type === 'enabled') {
                if (results.length === 0) {
                    console.log(chalk.yellow(`No plugins are currently enabled${argv.collection_name ? ` from collection "${argv.collection_name}"` : ''}.`));
                } else {
                    console.log(chalk.blue(`\nEnabled plugins${argv.collection_name ? ` from collection "${chalk.cyan(argv.collection_name)}"`:''}:`));
                    results.forEach(p => {
                        console.log(chalk.greenBright(`  - Invoke Name: ${chalk.yellow(p.invoke_name)}`));
                        console.log(chalk.gray(`    Original ID: ${p.collection_name}/${p.plugin_id}`));
                        console.log(chalk.gray(`    Config Path: ${p.config_path}`));
                        console.log(chalk.gray(`    Enabled On: ${p.added_on}`));
                    });
                }
            }

        } catch (error) {
            console.error(chalk.red(`ERROR in 'list' command: ${error.message}`));
            if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
            process.exit(1);
        }
    }
  )
  .demandCommand(1, chalk.red('You must provide a command (e.g., add, list, enable, disable, remove, update).'))
  .help()
  .alias('h', 'help')
  .strict()
  .wrap(process.stdout.columns || null)
  .parse();
