#!/usr/bin/env node
// cli.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsp = require('fs').promises;
const chalk = require('chalk');
const { spawn } = require('child_process');

const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const { setupWatch } = require('./src/watch_handler');
const { determinePluginToUse } = require('./src/plugin_determiner');
const CollectionsManager = require('./src/collections-manager');
const markdownUtils = require('./src/markdown_utils');
const yaml = require('js-yaml');


// Command modules
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
                    const currentConfigResolver = new ConfigResolver(watchedArgs.config, watchedArgs.factoryDefaults, watchedArgs.isLazyLoad || false);
                    await executorFunction(watchedArgs, currentConfigResolver);
                }
            );
        } else {
            const configResolver = new ConfigResolver(args.config, args.factoryDefaults, args.isLazyLoad || false);
            await executorFunction(args, configResolver);
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

    const knownGenerateOptions = ['pluginName', 'outdir', 'o', 'filename', 'f', 'open', 'watch', 'w', 'config', 'help', 'h', 'version', 'v', '$0', '_', 'factoryDefaults', 'factoryDefault', 'fd', 'pluginSpec', 'isLazyLoad', 'manager'];
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
            describe: 'Path to a custom YAML configuration file. This acts as the project-specific main config.',
            type: 'string',
            normalize: true,
        })
        .option('factory-defaults', {
            alias: ['factory-default', 'fd'],
            describe: 'Use only bundled default configurations, ignoring user (XDG) and project (--config) overrides.',
            type: 'boolean',
            default: false,
        })
        .option('coll-root', {
            alias: 'cr',
            describe: 'Specify the root directory for collections and plugins. Overrides config file and environment variables.',
            type: 'string',
            normalize: true,
        })
        .middleware(async (argv) => {
            const initialConfigResolver = new ConfigResolver(
                argv.config,
                argv.factoryDefaults,
                false
            );
            await initialConfigResolver._initializeResolverIfNeeded();
            const collRootFromMainConfig = await initialConfigResolver.getResolvedCollRoot();
            const collRootCliOverride = argv['coll-root'] || null;

            managerInstance = new CollectionsManager({
                debug: process.env.DEBUG_CM === 'true',
                collRootFromMainConfig: collRootFromMainConfig,
                collRootCliOverride: collRootCliOverride
            });

            argv.manager = managerInstance;
        })
        .command({
            ...convertCmdModule.defaultCmd,
            handler: async (args) => {
                if (args.markdownFile) {
                    // If the arg is not a real file and doesn't look like one, treat as an error.
                    const potentialFile = args.markdownFile;
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
        .alias("help", "h")
        .alias("version", "v")
        .strict()
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
                 if(firstArg && !['convert', 'generate', 'plugin', 'config', 'collection', 'update', 'up', '--help', '-h', '--version', '-v', '--config', '--factory-defaults', '--fd', '--coll-root', '-cr'].includes(firstArg) && (fs.existsSync(path.resolve(firstArg)) || firstArg.endsWith('.md'))){
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
        .epilogue("For more information, refer to the README.md file.");

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
