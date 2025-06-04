#!/usr/bin/env node
// cli.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsp = require('fs').promises;
const chalk = require('chalk'); // Added
const { spawn } = require('child_process');

const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const { setupWatch } = require('./src/watch_handler');
const { determinePluginToUse } = require('./src/plugin_determiner');
const CollectionsManager = require('./src/collections-manager');

// Command modules
const configCmd = require('./src/commands/configCmd.js');
const pluginCmd = require('./src/commands/pluginCmd.js');
const convertCmdModule = require('./src/commands/convertCmd.js');
const generateCmd = require('./src/commands/generateCmd.js');
const collectionCmd = require('./src/commands/collectionCmd.js');
const updateCmd = require('./src/commands/updateCmd.js'); // ADDED: Require the new update command

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
    const { pluginSpec, source: pluginSource, localConfigOverrides } = await determinePluginToUse(args, 'default');
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
    const managerInstance = new CollectionsManager({ debug: process.env.DEBUG_CM === 'true' });

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
        .middleware((argv) => {
            argv.manager = managerInstance; 
        })
        .command({
            ...convertCmdModule.defaultCmd,
            handler: async (args) => { 
                if (args.markdownFile) {
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
        .command(updateCmd) // ADDED: Register the new update command
        .command(configCmd)
        .alias("help", "h")
        .alias("version", "v")
        .strict() 
        .fail((msg, err, yargsInstance) => { 
            if (err) { // This err is from yargs own error handling (e.g., validation)
                console.error(chalk.red(msg || err.message)); // Use chalk here
                if (process.env.DEBUG_CM === 'true' && err.stack) console.error(chalk.red(err.stack));
                yargsInstance.showHelp();
                process.exit(1);
                return; // Explicit return
            }
            // This block handles other failures, like command not found by yargs
            if (msg && msg.includes("Unknown argument")) { 
                 const firstArg = process.argv[2]; 
                 if(firstArg && !['convert', 'generate', 'plugin', 'config', 'collection', 'update', 'up', '--help', '-h', '--version', '-v', '--config', '--factory-defaults', '--fd'].includes(firstArg) && (fs.existsSync(path.resolve(firstArg)) || firstArg.endsWith('.md'))){ // MODIFIED: Added 'update', 'up' to known arguments
                     console.error(chalk.red(`ERROR: ${msg}`));
                     console.error(chalk.yellow(`\nIf you intended to convert '${firstArg}', ensure all options are valid for the convert command or the default command.`));
                     yargsInstance.showHelp();
                     process.exit(1);
                     return; // Explicit return
                 }
            }
            console.error(chalk.red(msg || "An error occurred."));
            if (msg) console.error(chalk.yellow("For usage details, run with --help."));
            process.exit(1);
        })
        .epilogue("For more information, refer to the README.md file.");

    const parsedArgs = await argvBuilder.argv;

    if (parsedArgs._.length === 0 && !parsedArgs.markdownFile && !(['plugin', 'config', 'collection', 'update'].includes(parsedArgs.$0 || parsedArgs._[0]))) { // MODIFIED: Added 'update'
         const knownTopLevelCommands = ['convert', 'generate', 'plugin', 'config', 'collection', 'update']; // MODIFIED: Added 'update'
         const commandGiven = knownTopLevelCommands.some(cmd => process.argv.includes(cmd)); 
        if (!commandGiven && !parsedArgs.markdownFile) {
             argvBuilder.showHelp();
        }
    }
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
