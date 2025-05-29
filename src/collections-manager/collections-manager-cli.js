#!/usr/bin/env node

// collections-manager-cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const CollectionsManager = require('./index.js');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs'); // Synchronous fs for existsSync
const fsp = require('fs').promises; // Asynchronous fs for readFile
const yaml = require('js-yaml'); // To read metadata for originalSourceForPrefixFallback

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
            console.log(chalk.gray(`    md-to-pdf-cm list all ${path.basename(resultPath)}`));
            console.log(chalk.blueBright("\nTo activate plugins from this collection, use (example):"));
            console.log(chalk.gray(`    md-to-pdf-cm enable ${path.basename(resultPath)}/<plugin_id_from_list_all> [--name <your_invoke_name>]`));
            console.log(chalk.blueBright("\nOr to activate all plugins from this collection (example):"));
            console.log(chalk.gray(`    md-to-pdf-cm enable ${path.basename(resultPath)} --all`));
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
    'enable <target>',
    'Enables a plugin or all plugins from a collection.',
    (yargsCmd) => {
      yargsCmd
        .positional('target', {
          describe: 'The plugin to enable ("collection_name/plugin_id") OR the collection name (if using --all).',
          type: 'string',
          demandOption: true,
        })
        .option('name', {
          describe: 'Optional. An alternative "invoke_name" to register the plugin under (only for single plugin enablement).',
          type: 'string'
        })
        .option('all', {
          describe: `Enable all available plugins from the specified collection name.
                   Default prefixing behavior for invoke names when using --all:
                   - GitHub/GitLab source: Uses <username>-<plugin_id>.
                   - Other Git source: Uses <collection_name>-<plugin_id>.
                   - Local path source: Uses <plugin_id> (no prefix).
                   Use --prefix or --no-prefix to override this default.
                   Note: This is a point-in-time action. If the collection is updated later with new plugins,
                   this command needs to be re-run if you wish to enable those new plugins.`,
          type: 'boolean',
          default: false
        })
        .option('prefix', {
          describe: 'Optional. A custom prefix string for invoke names when using --all. Overrides default prefixing.',
          type: 'string'
        })
        .option('no-prefix', {
          describe: 'Optional. Disables all automatic prefixing when using --all, using only plugin_id as invoke_name. Use with caution due to potential conflicts.',
          type: 'boolean',
          default: false
        });
    },
    async (argv) => {
      if (argv.all) {
        console.log(chalk.blueBright(`Collections Manager CLI: Attempting to enable all plugins in collection...`));
        console.log(`  Collection Name: ${chalk.cyan(argv.target)}`);

        let originalSourceForPrefixFallback = "";
        try {
            const metadataPath = path.join(manager.collRoot, argv.target, '.collection-metadata.yaml');
            if (fs.existsSync(metadataPath)) {
                const metaContent = await fsp.readFile(metadataPath, 'utf8');
                const metadata = yaml.load(metaContent);
                if (metadata && metadata.source) {
                    originalSourceForPrefixFallback = metadata.source;
                }
            }
        } catch (e) {
            if(process.env.DEBUG_CM === 'true') console.warn(chalk.yellow(`  WARN: Could not read metadata for prefix fallback heuristic: ${e.message}`));
        }

        if (argv.prefix) {
          console.log(`  Using custom prefix for invoke names: ${chalk.yellow(argv.prefix)}`);
        } else if (argv.noPrefix) {
          console.log(chalk.yellow('  --no-prefix specified: Attempting to enable plugins with their original IDs as invoke names.'));
        } else {
          console.log(chalk.blue('  Using default prefixing strategy for invoke names (see help for details).'));
        }

        try {
          const result = await manager.enableAllPluginsInCollection(argv.target, {
            prefix: argv.prefix,
            noPrefix: argv.noPrefix,
            isCliCall: true,
            originalSourceForPrefixFallback
          });
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
        if (argv.name) {
          console.log(`  Requested invoke name: ${chalk.yellow(argv.name)}`);
        }
        if (argv.prefix || argv.noPrefix){
            console.warn(chalk.yellow("WARN: --prefix and --no-prefix options are ignored when not using --all."))
        }
        try {
          const result = await manager.enablePlugin(argv.target, { name: argv.name });
          if (result && result.success) {
              const finalInvokeName = result.invoke_name || argv.target.split('/')[1];
              console.log(chalk.blueBright(`\nTo use this plugin with md-to-pdf, invoke it as: `) + chalk.gray(`md-to-pdf convert ... --plugin ${finalInvokeName}`));
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
    `Updates a Git-based plugin collection to match its remote source.
Local modifications in the collection directory (e.g., in ${chalk.dim('~/.local/share/md-to-pdf/collections/<collection_name>')}) will be overwritten.
The update will be aborted if local uncommitted changes or unpushed local commits are detected.

To preserve custom changes, clone the collection to a separate local directory and register it, or use the 'archetype' command.

If no collection name is specified, attempts to update all Git-based collections.
Note: This command only syncs the collection; it does not automatically enable any new plugins that might be added to the remote collection.`,
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
          if (!result.success) {
             console.warn(chalk.yellow(`Update for '${argv.collection_name}' reported issues: ${result.message}`));
          }
        } catch (error) {
          console.error(chalk.red(`\nERROR in 'update ${argv.collection_name}' command: ${error.message}`));
          if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
          process.exit(1);
        }
      } else {
        console.log(chalk.blueBright('Collections Manager CLI: Attempting to update all Git-based collections...'));
        try {
          const results = await manager.updateAllCollections();
           results.messages.forEach(msg => {
             if (msg.includes("updated.") || msg.includes("not from a recognized Git source.") || msg.includes("No collections downloaded.")) {
                console.log(chalk.blue(`  ${msg}`));
             } else if (msg.includes("has local changes")) {
                console.log(chalk.yellow(`  ${msg}`));
             } else {
                console.log(chalk.red(`  ${msg}`));
             }
           });
           if (!results.success) {
             console.warn(chalk.yellow("Some collections may not have updated successfully or were skipped. Check logs above."));
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
    'archetype <sourcePluginIdentifier> <newArchetypeName>',
    `Creates a customizable copy (archetype) of an existing plugin.
The source plugin is identified by <collection_name>/<plugin_id>.
The new archetype will be named <newArchetypeName>.`,
    (yargsCmd) => {
      yargsCmd
        .positional('sourcePluginIdentifier', {
          describe: 'The identifier for the source plugin, in the format "collection_name/plugin_id".',
          type: 'string',
          demandOption: true,
        })
        .positional('newArchetypeName', {
          describe: 'The name for the new archetyped plugin. This will be its directory name.',
          type: 'string',
          demandOption: true,
        })
        .option('target-dir', {
          alias: 't',
          describe: `Optional. Specifies the base directory where the '<newArchetypeName>' directory will be created.
                   Defaults to a user-specific directory (e.g., ~/.local/share/md-to-pdf/custom_plugins/).`,
          type: 'string',
        });
    },
    async (argv) => {
      console.log(chalk.blueBright(`Collections Manager CLI: Attempting to create archetype...`));
      console.log(`  Source Plugin: ${chalk.cyan(argv.sourcePluginIdentifier)}`);
      console.log(`  New Archetype Name: ${chalk.yellow(argv.newArchetypeName)}`);
      if (argv.targetDir) {
        console.log(`  Target Directory: ${chalk.underline(argv.targetDir)}`);
      }
      try {
        const result = await manager.archetypePlugin(argv.sourcePluginIdentifier, argv.newArchetypeName, { targetDir: argv.targetDir });
        if (result && result.success) {
            console.log(chalk.green(`\nPlugin archetype '${chalk.bold(argv.newArchetypeName)}' created from '${argv.sourcePluginIdentifier}' at:\n    ${chalk.underline(result.archetypePath)}\n`));
            console.log(chalk.blueBright("To use this new plugin with md-to-pdf:"));
            console.log(chalk.gray("  1. Ensure it's in a location md-to-pdf can access (e.g., if using project-relative paths)."));
            console.log(chalk.gray(`  2. Register it in your md-to-pdf configuration file (e.g., ~/.config/md-to-pdf/config.yaml or a project config):`));
            console.log(chalk.gray("     plugins:"));
            console.log(chalk.gray(`       ${argv.newArchetypeName}: "${result.archetypePath}/${argv.newArchetypeName}.config.yaml"`));
            console.log(chalk.gray(`  3. Then invoke: md-to-pdf convert mydoc.md --plugin ${argv.newArchetypeName}`));
        } else {
            console.error(chalk.red(`Failed to create archetype. ${result ? result.message : 'Unknown error.'}`));
        }
      } catch (error) {
        console.error(chalk.red(`\nERROR in 'archetype' command: ${error.message}`));
        if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
        process.exit(1);
      }
    }
  )
  .command(
    'list [type] [<collection_name>]',
    `Lists plugins or collections. Default: shows all plugins found in downloaded collections ('all').`,
    (yargsCmd) => {
        yargsCmd
            .positional('type', {
                describe: `Specify what to list:
                          'all' (default): All usable plugins found in downloaded collections.
                          'enabled': Only actively enabled plugins.
                          'disabled': Available plugins that are not currently enabled.
                          'collections': Names of all downloaded collection directories.`,
                type: 'string',
                default: 'all',
                choices: ['all', 'enabled', 'disabled', 'collections']
            })
            .positional('collection_name', {
                describe: `Optional. Filter plugins by this collection name (not applicable for "list collections").`,
                type: 'string'
            });
    },
    async (argv) => {
        try {
            let results;

            if (argv.type === 'collections') {
                if (argv.collection_name) {
                    console.warn(chalk.yellow("WARN: Specifying a collection name has no effect when listing 'collections'."));
                }
                results = await manager.listCollections('downloaded');
                if (results.length === 0) {
                    console.log(chalk.yellow("No collections downloaded."));
                    return;
                }
                console.log(chalk.blue("\nDownloaded plugin collections:"));
                results.forEach(name => console.log(chalk.greenBright(`  - ${name}`)));

            } else if (argv.type === 'all') {
                results = await manager.listAvailablePlugins(argv.collection_name);
                const inCollectionMsg = argv.collection_name ? ` in collection "${chalk.cyan(argv.collection_name)}"` : ' from all collections';
                if (results.length === 0) {
                    console.log(chalk.yellow(`No plugins found${inCollectionMsg}.`));
                    return;
                }
                console.log(chalk.blue(`\nAll available plugins${inCollectionMsg}:`));
                results.forEach(p => {
                    console.log(chalk.greenBright(`  - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
                    console.log(chalk.gray(`    Collection: ${p.collection}`));
                    console.log(chalk.gray(`    Description: ${p.description}`));
                    console.log(chalk.gray(`    Config Path: ${p.config_path}`));
                });

            } else if (argv.type === 'enabled') {
                results = await manager.listCollections('enabled', argv.collection_name);
                const fromCollectionMsg = argv.collection_name ? ` from collection "${chalk.cyan(argv.collection_name)}"`: '';
                 if (results.length === 0) {
                    console.log(chalk.yellow(`No plugins are currently enabled${fromCollectionMsg}.`));
                    return;
                }
                console.log(chalk.blue(`\nEnabled plugins${fromCollectionMsg}:`));
                results.forEach(p => {
                    console.log(chalk.greenBright(`  - Invoke Name: ${chalk.yellow(p.invoke_name)}`));
                    console.log(chalk.gray(`    Original ID: ${p.collection_name}/${p.plugin_id}`));
                    console.log(chalk.gray(`    Config Path: ${p.config_path}`));
                    console.log(chalk.gray(`    Enabled On: ${p.added_on}`));
                });
            } else if (argv.type === 'disabled') {
                const availablePlugins = await manager.listAvailablePlugins(argv.collection_name);
                const enabledPluginsList = await manager.listCollections('enabled', argv.collection_name);
                const enabledPluginIds = new Set(enabledPluginsList.map(p => `${p.collection_name}/${p.plugin_id}`));

                results = availablePlugins.filter(p => !enabledPluginIds.has(`${p.collection}/${p.plugin_id}`));

                const inCollectionMsg = argv.collection_name ? ` in collection "${chalk.cyan(argv.collection_name)}"` : ' from all collections';
                if (results.length === 0) {
                    console.log(chalk.yellow(`No disabled (but available) plugins found${inCollectionMsg}.`));
                    return;
                }
                console.log(chalk.blue(`\nDisabled (but available) plugins${inCollectionMsg}:`));
                results.forEach(p => {
                    console.log(chalk.greenBright(`  - Plugin ID: ${chalk.yellow(p.plugin_id)}`));
                    console.log(chalk.gray(`    Collection: ${p.collection}`));
                    console.log(chalk.gray(`    Description: ${p.description}`));
                    console.log(chalk.gray(`    Config Path: ${p.config_path}`));
                });
            }
        } catch (error) {
            console.error(chalk.red(`ERROR in 'list' command: ${error.message}`));
            if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
            process.exit(1);
        }
    }
  )
  .demandCommand(1, chalk.red('You must provide a command (e.g., add, list, enable, disable, remove, update, archetype).'))
  .help()
  .alias('h', 'help')
  .strict()
  .wrap(process.stdout.columns || null)
  .parse();
