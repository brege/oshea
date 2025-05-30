#!/usr/bin/env node
// cli.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsp = require('fs').promises;

const { spawn } = require('child_process');

const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const { setupWatch } = require('./src/watch_handler');
const { determinePluginToUse } = require('./src/plugin_determiner');

// Command modules
const configCmd = require('./src/commands/configCmd.js');
const pluginCmd = require('./src/commands/pluginCmd.js');
const convertCmdModule = require('./src/commands/convertCmd.js');
const generateCmd = require('./src/commands/generateCmd.js');

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
        console.error(`ERROR in '${commandType}' command for plugin '${pluginNameForError}': ${error.message}`);
        if (error.stack && !args.watch) console.error(error.stack);
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

    const knownGenerateOptions = ['pluginName', 'outdir', 'o', 'filename', 'f', 'open', 'watch', 'w', 'config', 'help', 'h', 'version', 'v', '$0', '_', 'factoryDefaults', 'factoryDefault', 'fd', 'pluginSpec', 'isLazyLoad'];
    const cliArgsForPlugin = {};
    for (const key in args) {
        if (!knownGenerateOptions.includes(key) && Object.prototype.hasOwnProperty.call(args, key)) {
            cliArgsForPlugin[key] = args[key];
        }
    }

    const dataForPlugin = { cliArgs: cliArgsForPlugin };
    const outputFilename = args.filename;
    let outputDir = args.outdir; // Default is '.', path.resolve will handle it
     if (args.outdir) { // Ensure outputDir is resolved if provided
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
        .command({
            ...convertCmdModule.defaultCmd,
            handler: async (args) => { // Override handler for $0
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
            handler: async (args) => { // Override handler for explicit convert
                args.isLazyLoad = false;
                await commonCommandHandler(args, executeConversion, 'convert (explicit)');
            }
        })
        .command({
            ...generateCmd,
            handler: async (args) => { // Override handler for generate
                args.isLazyLoad = false;
                await commonCommandHandler(args, executeGeneration, 'generate');
            }
        })
        .command(pluginCmd)
        .command(configCmd)
        .alias("help", "h")
        .alias("version", "v")
        .strict() 
        .fail((msg, err, yargsInstance) => { 
            if (err) throw err; 
            if (msg && msg.includes("Unknown argument")) { 
                 const firstArg = process.argv[2]; 
                 if(firstArg && !['convert', 'generate', 'plugin', 'config', '--help', '-h', '--version', '-v', '--config', '--factory-defaults', '--fd'].includes(firstArg) && (fs.existsSync(path.resolve(firstArg)) || firstArg.endsWith('.md'))){
                     console.error(`ERROR: ${msg}`);
                     console.error(`\nIf you intended to convert '${firstArg}', ensure all options are valid for the convert command or the default command.`);
                     yargsInstance.showHelp();
                     process.exit(1);
                 }
            }
            console.error(msg || "An error occurred.");
            if (msg) console.error("For usage details, run with --help.");
            process.exit(1);
        })
        .epilogue("For more information, refer to the README.md file.");

    const parsedArgs = await argvBuilder.argv;

    // This check might be redundant now due to how $0 is handled, but keeping for safety.
    if (parsedArgs._.length === 0 && !parsedArgs.markdownFile && !(['plugin', 'config'].includes(parsedArgs.$0 || parsedArgs._[0]))) {
         const knownTopLevelCommands = ['convert', 'generate', 'plugin', 'config'];
         const commandGiven = knownTopLevelCommands.some(cmd => process.argv.includes(cmd)); // Check raw argv
        if (!commandGiven && !parsedArgs.markdownFile) {
             argvBuilder.showHelp();
        }
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (reason instanceof Error && reason.stack) {
        console.error(reason.stack);
    }
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = { openPdf };
