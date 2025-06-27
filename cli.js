#!/usr/bin/env node
// cli.js

const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');

const argvRaw = hideBin(process.argv);
const isCompletionScriptGeneration = argvRaw.includes('completion') && !argvRaw.includes('--get-yargs-completions');

if (argvRaw.includes('--get-yargs-completions') && !isCompletionScriptGeneration) {
    const { getSuggestions } = require('./src/tab-completion/engine.js'); 

    const completionArgv = {
        _: [],
        'get-yargs-completions': true 
    };
    let currentWord = '';

    for (let i = 0; i < argvRaw.length; i++) {
        const arg = argvRaw[i];
        if (arg === '--get-yargs-completions') {
            continue;
        }
        if (arg.startsWith('-')) {
            if (i === argvRaw.length - 1) {
                currentWord = arg;
            }
        } else {
            completionArgv._.push(arg);
            if (i === argvRaw.length - 1) {
                currentWord = arg;
            }
        }
    }

    if (completionArgv._.length > 0 && completionArgv._[completionArgv._.length - 1] === currentWord && !currentWord.startsWith('-')) {
        completionArgv._.pop();
    } 

    const suggestions = getSuggestions(completionArgv, currentWord);
    console.log(suggestions.join('\n'));
    process.exit(0);
}


const os = require('os'); 
const fsp = require('fs').promises; 
const chalk = require('chalk');
const { spawn, execSync } = require('child_process');

const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const { setupWatch } = require('./src/watch_handler');
const { determinePluginToUse } = require('./src/plugin_determiner');
const CollectionsManager = require('./src/collections-manager');
const MainConfigLoader = require('./src/main_config_loader.js');
const markdownUtils = require('./src/markdown_utils');
const yaml = require('js-yaml');

const yargs = require('yargs/yargs');

const configCmd = require('./src/commands/configCmd.js');
const pluginCmd = require('./src/commands/pluginCmd.js');
const convertCmdModule = require('./src/commands/convertCmd.js');
const generateCmd = require('./src/commands/generateCmd.js');
const collectionCmd = require('./src/commands/collectionCmd.js');
const updateCmd = require('./src/commands/updateCmd.js');


function openPdf(pdfPath, viewerCommand) {
    if (!viewerCommand) {
        console.log(`PDF viewer not configured. PDF generated at: ${pdfPath}`);
        return;
    }
    console.log(`Attempting to open PDF "${pdfPath}" with: ${viewerCommand}`);
    try {
        const [command, ...args] = viewerCommand.split(' ');
        const viewerProcess = spawn(command, [...args, pdfPath], {
            detached: true,
            stdio: 'ignore',
        });
        viewerProcess.on('error', (err) => {
            console.warn(`WARN: Failed to start PDF viewer '${viewerCommand}': ${err.message}.`);
            console.warn(`Please open "${pdfPath}" manually.`);
        });
        viewerProcess.unref();
    } catch (e) {
        console.warn(`WARN: Error trying to open PDF with '${viewerCommand}': ${e.message}.`);
        console.warn(`Please open "${pdfPath}" manually.`);
    }
}

async function commonCommandHandler(args, executorFunction, commandType) {
    try {
        if (args.watch) {
            await setupWatch(args, null,
                async (watchedArgs) => {
                    const currentConfigResolver = new ConfigResolver(watchedArgs.config, watchedArgs.factoryDefaults, watchedArgs.isLazyLoad || false, { collRoot: watchedArgs.manager.collRoot });
                    await executorFunction(watchedArgs, currentConfigResolver);
                }
            );
        } else {
            await executorFunction(args, args.configResolver);
        }
    } catch (error) {
        const pluginNameForError = args.pluginSpec || args.plugin || args.pluginName || 'N/A';
        console.error(chalk.red(`ERROR in '${commandType}' command for plugin '${pluginNameForError}': ${error.message}`));
        if (error.stack && !args.watch) console.error(chalk.red(error.stack));
        if (!args.watch) process.exit(1);
    }
}

async function executeConversion(args, configResolver) {
    const dependenciesForPluginDeterminer = {
        fsPromises: fsp,
        fsSync: fs,
        path: path,
        yaml: yaml,
        markdownUtils: markdownUtils,
        processCwd: process.cwd
    };

    const { pluginSpec, source: pluginSource, localConfigOverrides } = await determinePluginToUse(args, dependenciesForPluginDeterminer, 'default');
    args.pluginSpec = pluginSpec;

    console.log(`Processing 'convert' for: ${args.markdownFile}`);

    const resolvedMarkdownPath = path.resolve(args.markdownFile);

    const effectiveConfig = await configResolver.getEffectiveConfig(pluginSpec, localConfigOverrides, resolvedMarkdownPath);
    const mainLoadedConfig = effectiveConfig.mainConfig;

    let outputDir;
    if (args.outdir) {
        outputDir = path.resolve(args.outdir);
    } else {
        outputDir = path.join(os.tmpdir(), 'md-to-pdf-output');
        if (!(args.isLazyLoad && pluginSource !== 'CLI option')) {
            console.log(`INFO: No output directory specified. Defaulting to temporary directory: ${outputDir}`);
        }
    }

    if (!fs.existsSync(outputDir)) {
        await fsp.mkdir(outputDir, { recursive: true });
        if (!(args.isLazyLoad && pluginSource !== 'CLI option')) {
             console.log(`INFO: Created output directory: ${outputDir}`);
        }
    }

    const dataForPlugin = { markdownFilePath: resolvedMarkdownPath };

    const pluginManager = new PluginManager();
    const generatedPdfPath = await pluginManager.invokeHandler(
        pluginSpec,
        effectiveConfig,
        dataForPlugin,
        outputDir,
        args.filename
    );

    if (generatedPdfPath) {
        console.log(`Successfully generated PDF with plugin '${pluginSpec}': ${generatedPdfPath}`);
        const viewer = mainLoadedConfig.pdf_viewer;
        if (args.open && viewer) {
            openPdf(generatedPdfPath, viewer);
        } else if (args.open && !viewer) {
            console.log(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
        } else if (!args.open && !args.outdir) {
            console.log(`PDF saved to temporary directory: ${generatedPdfPath}`);
        }
    } else {
        if (!args.watch) throw new Error(`PDF generation failed for plugin '${pluginSpec}' (determined via ${pluginSource}).`);
    }
    console.log(`convert command finished.`);
}

async function executeGeneration(args, configResolver) {
    const pluginToUse = args.pluginName;
    args.pluginSpec = pluginToUse;
    console.log(`Processing 'generate' command for plugin: ${pluginToUse}`);

    const effectiveConfig = await configResolver.getEffectiveConfig(pluginToUse, null, null);
    const mainLoadedConfig = effectiveConfig.mainConfig;

    const knownGenerateOptions = ['pluginName', 'outdir', 'o', 'filename', 'f', 'open', 'watch', 'w', 'config', 'help', 'h', 'version', 'v', '$0', '_', 'factoryDefaults', 'pluginSpec', 'isLazyLoad', 'manager'];
    const cliArgsForPlugin = {};
    for (const key in args) {
        if (!knownGenerateOptions.includes(key) && Object.prototype.hasOwnProperty.call(args, key)) {
            cliArgsForPlugin[key] = args[key];
        }
    }

    const dataForPlugin = { cliArgs: cliArgsForPlugin };
    const outputFilename = args.filename;
    let outputDir = args.outdir;
     if (args.outdir) {
        outputDir = path.resolve(args.outdir);
    }

    if (!fs.existsSync(outputDir)) {
        await fsp.mkdir(outputDir, { recursive: true });
        console.log(`INFO: Created output directory: ${outputDir}`);
    }

    const pluginManager = new PluginManager();
    const generatedPdfPath = await pluginManager.invokeHandler(
        pluginToUse,
        effectiveConfig,
        dataForPlugin,
        outputDir,
        outputFilename
    );

    if (generatedPdfPath) {
        console.log(`Successfully generated PDF via plugin '${pluginToUse}': ${generatedPdfPath}`);
        const viewer = mainLoadedConfig.pdf_viewer;
        if (args.open && viewer) {
            openPdf(generatedPdfPath, viewer);
        } else if (args.open && !viewer) {
            console.log(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
        }
    } else {
        if (!args.watch) throw new Error(`PDF generation failed for plugin '${pluginToUse}'.`);
    }
    console.log(`generate command finished.`);
}

async function main() {
    let managerInstance;

    const argvBuilder = yargs(hideBin(process.argv)) 
        .parserConfiguration({ 'short-option-groups': false })
        .scriptName("md-to-pdf") 
        .usage("Usage: $0 <command_or_markdown_file> [options]")
        .option('config', {
            describe: 'path to a project-specific YAML config file',
            type: 'string',
            normalize: true,
        })
        .option('factory-defaults', {
            describe: 'use only bundled default config, ignores overrides',
            type: 'boolean',
            default: false,
        })
        .option('coll-root', {
            describe: 'overrides the main collection directory',
            type: 'string',
            normalize: true,
        });

        argvBuilder.middleware(async (argv) => {
            const mainConfigLoader = new MainConfigLoader(path.resolve(__dirname, '..'), argv.config, argv.factoryDefaults);
            const primaryConfig = await mainConfigLoader.getPrimaryMainConfig();
            const collRootFromMainConfig = primaryConfig.config.collections_root || null;
            const collRootCliOverride = argv['coll-root'] || null;

            managerInstance = new CollectionsManager({
                debug: process.env.DEBUG_CM === 'true',
                collRootFromMainConfig: collRootFromMainConfig,
                collRootCliOverride: collRootCliOverride
            });
            
            argv.manager = managerInstance;

            const configResolver = new ConfigResolver(
                argv.config,
                argv.factoryDefaults,
                false, 
                { collRoot: managerInstance.collRoot }
            );
            argv.configResolver = configResolver;
        });

        argvBuilder.completion();

        argvBuilder.command({
            command: '_tab_cache',
            describe: false,
            builder: (yargsCmd) => {
                yargsCmd.option('config', { type: 'string' })
                         .option('coll-root', { type: 'string' });
            },
            handler: (args) => {
                const staticCacheScript = path.resolve(__dirname, 'scripts', 'completion', 'generate-completion-cache.js');
                const dynamicCacheScript = path.resolve(__dirname, 'scripts', 'completion', 'generate-completion-dynamic-cache.js');
                
                try {
                    execSync(`node "${staticCacheScript}"`, { stdio: 'inherit', env: { ...process.env, DEBUG: args.debug } });
                    execSync(`node "${dynamicCacheScript}"`, { stdio: 'inherit', env: { ...process.env, DEBUG: args.debug } });
                } catch (error) {
                    console.error(chalk.red(`ERROR: Cache generation failed: ${error.message}`));
                    process.exit(1);
                }
            }
        });

        argvBuilder
        .command({
            ...convertCmdModule.defaultCmd,
            handler: async (args) => {
                const potentialFile = args.markdownFile;
                if (potentialFile) {
                    if (!fs.existsSync(potentialFile) && !potentialFile.endsWith('.md') && !potentialFile.endsWith('.mdx')) {
                         console.error(chalk.red(`Error: Unknown command: '${potentialFile}'`));
                         console.error(chalk.yellow("\nTo convert a file, provide a valid path. For other commands, see --help."));
                         process.exit(1);
                    }
                    args.isLazyLoad = true;
                    await commonCommandHandler(args, executeConversion, 'convert (implicit)');
                } else { 
                    argvBuilder.showHelp();
                }
            }
        })
        .command({
            ...convertCmdModule.explicitConvert,
            handler: async (args) => {
                args.isLazyLoad = false;
                await commonCommandHandler(args, executeConversion, 'convert (explicit)');
            }
        })
        .command({
            ...generateCmd,
            handler: async (args) => {
                args.isLazyLoad = false;
                await commonCommandHandler(args, executeGeneration, 'generate');
            }
        })
        .command(pluginCmd)
        .command(collectionCmd)
        .command(updateCmd)
        .command(configCmd)
        .alias('h', 'help')
        .alias('v', 'version')
        .strictCommands()
        .fail((msg, err, yargsInstance) => {
            if (err) {
                console.error(chalk.red(msg || err.message));
                if (process.env.DEBUG_CM === 'true' && err.stack) console.error(chalk.red(err.stack));
                yargsInstance.showHelp();
                process.exit(1);
                return;
            }
             if (msg && msg.includes("Unknown argument")) {
                 const firstArg = process.argv[2];
                 if(firstArg && !['convert', 'generate', 'plugin', 'config', 'collection', 'update', 'up', '--help', '-h', '--version', '-v', '--config', '--factory-defaults', '--coll-root'].includes(firstArg) && (fs.existsSync(path.resolve(firstArg)) || firstArg.endsWith('.md'))){
                     console.error(chalk.red(`ERROR: ${msg}`));
                     console.error(chalk.yellow(`\nIf you intended to convert '${firstArg}', ensure all options are valid for the convert command or the default command.`));
                     yargsInstance.showHelp();
                     process.exit(1);
                     return;
                 }
            }
            console.error(chalk.red(msg || "An error occurred."));
            if (msg) console.error(chalk.yellow("For usage details, run with --help."));
            process.exit(1);
        })
        .epilogue(chalk.gray(
            "For more information, refer to the README.md file.\n" +
            "Tab-completion Tip:\n" +
            "   echo 'source <(md-to-pdf completion)' >> ~/.bashrc\n" +
            "   echo 'source <(md-to-pdf completion)' >> ~/.zshrc\n" +
            "then run `source ~/.bashrc` or `source ~/.zshrc`"
        ));

    await argvBuilder.argv;
}

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    if (reason instanceof Error && reason.stack) {
        console.error(chalk.red(reason.stack));
    }
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error);
    if (error.stack) {
        console.error(chalk.red(error.stack));
    }
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = { openPdf };
