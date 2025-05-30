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
const PluginRegistryBuilder = require('./src/PluginRegistryBuilder');
const { scaffoldPlugin } = require('./src/plugin_scaffolder');
const { displayPluginHelp } = require('./src/get_help');
const { displayConfig } = require('./src/config_display');
const { determinePluginToUse } = require('./src/plugin_determiner');

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

    // Pass localConfigOverrides AND resolvedMarkdownPath to getEffectiveConfig
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

    // For 'generate', markdownFilePath is not directly applicable for localConfigOverrides resolution in the same way.
    // So, pass null for markdownFilePath. localConfigOverrides would also likely be null.
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
    const outputDir = path.resolve(args.outdir);

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
    const cliOptionsForConvert = (y) => {
        y.positional("markdownFile", { describe: "Path to the input Markdown file.", type: "string" })
            .option("plugin", { alias: "p", describe: "Plugin to use (name or path). Overrides front matter and local .config.yaml.", type: "string" })
            .option("outdir", { alias: "o", describe: "Output directory. Defaults to a system temporary directory if not specified.", type: "string" })
            .option("filename", { alias: "f", describe: "Output PDF filename.", type: "string" })
            .option("open", { describe: "Open PDF after generation.", type: "boolean", default: true })
            .option("watch", { alias: "w", describe: "Watch for changes.", type: "boolean", default: false });
    };

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
        .command(
            '$0 [markdownFile]',
            "Converts a Markdown file to PDF. If markdownFile is provided, implicitly acts as 'convert'.",
            cliOptionsForConvert, 
            async (args) => {
                if (args.markdownFile) {
                    args.isLazyLoad = true; 
                    await commonCommandHandler(args, executeConversion, 'convert (implicit)');
                } else {
                    argvBuilder.showHelp();
                }
            }
        )
        .command(
            "convert <markdownFile>",
            "Convert a single Markdown file to PDF using a specified plugin.",
            cliOptionsForConvert, 
            (args) => {
                args.isLazyLoad = false; 
                commonCommandHandler(args, executeConversion, 'convert (explicit)');
            }
        )
        .command(
            "generate <pluginName>",
            "Generate a document using a specified plugin that requires complex inputs.",
            (y) => {
                y.positional("pluginName", { describe: "Name of the plugin.", type: "string" })
                    .option("outdir", { alias: "o", describe: "Output directory.", type: "string", default: "." })
                    .option("filename", { alias: "f", describe: "Output PDF filename.", type: "string" })
                    .option("open", { describe: "Open PDF after generation.", type: "boolean", default: true })
                    .option("watch", { alias: "w", describe: "Watch for changes.", type: "boolean", default: false });
                y.strict(false); 
            },
            (args) => {
                args.isLazyLoad = false;
                commonCommandHandler(args, executeGeneration, 'generate');
            }
        )
        .command(
            "plugin <subcommand>",
            "Manage plugins.",
            (pluginYargs) => {
                pluginYargs.command(
                    "list",
                    "List all discoverable plugins.",
                    () => {}, 
                    async (args) => {
                        try {
                            console.log("Discovering plugins...");
                            const builder = new PluginRegistryBuilder(
                                __dirname, // Changed: Use __dirname as projectRoot
                                null, 
                                args.config, 
                                args.factoryDefaults,
                                args.isLazyLoadMode || false 
                            );
                            const pluginDetailsList = await builder.getAllPluginDetails();

                            if (pluginDetailsList.length === 0) {
                                console.log("No plugins found or registered.");
                                return;
                            }

                            console.log(`\nFound ${pluginDetailsList.length} plugin(s):\n`);
                            pluginDetailsList.forEach(plugin => {
                                console.log(`  Name: ${plugin.name}`);
                                console.log(`    Description: ${plugin.description}`);
                                console.log(`    Source: ${plugin.registrationSourceDisplay}`);
                                console.log(`    Config: ${plugin.configPath}`);
                                console.log(`  ---`);
                            });
                        } catch (error) {
                            console.error(`ERROR listing plugins: ${error.message}`);
                            if (error.stack) console.error(error.stack);
                            process.exit(1);
                        }
                    }
                )
                .command(
                    "create <pluginName>",
                    "Create a new plugin boilerplate.",
                    (y) => {
                        y.positional("pluginName", {
                            describe: "Name for the new plugin.",
                            type: "string"
                        })
                        .option("dir", {
                            describe: "Directory to create the plugin in. Defaults to current directory.",
                            type: "string",
                            normalize: true
                        })
                        .option("force", {
                            describe: "Overwrite existing plugin directory if it exists.",
                            type: "boolean",
                            default: false
                        });
                    },
                    async (args) => {
                        try {
                            const success = await scaffoldPlugin(args.pluginName, args.dir, args.force);
                            if (!success) {
                                process.exit(1);
                            }
                        } catch (error) {
                            console.error(`ERROR during 'plugin create ${args.pluginName}': ${error.message}`);
                            if (error.stack) console.error(error.stack);
                            process.exit(1);
                        }
                    }
                )
                .command(
                    "help <pluginName>",
                    "Display detailed help for a specific plugin.",
                    (y) => {
                        y.positional("pluginName", {
                            describe: "Name of the plugin for which to display help.",
                            type: "string"
                        });
                    },
                    async (args) => {
                        try {
                            args.isLazyLoad = false; 
                            await displayPluginHelp(args.pluginName, args);
                        } catch (error) {
                            console.error(`ERROR displaying help for plugin '${args.pluginName}': ${error.message}`);
                            if (error.stack) console.error(error.stack);
                            process.exit(1);
                        }
                    }
                )
                .demandCommand(1, "You need to specify a plugin subcommand (e.g., list, create, help).")
                .strict(); 
            }
        )
        .command(
            "config",
            "Display active configuration settings. Use --pure for config-only output.",
            (y) => {
                y.option("plugin", {
                    alias: "p",
                    describe: "Display effective configuration for a specific plugin.",
                    type: "string"
                })
                .option("pure", {
                    describe: "Output only the raw configuration data, suitable for piping or copying.",
                    type: "boolean",
                    default: false
                });
            },
            async (args) => {
                args.isLazyLoad = false; 
                await displayConfig(args);
            }
        )
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

    if (parsedArgs._.length === 0 && !parsedArgs.markdownFile && !(['plugin', 'config'].includes(parsedArgs.$0))) {
        const knownCommands = ['convert', 'generate', 'plugin', 'config'];
        const commandGiven = knownCommands.some(cmd => parsedArgs._.includes(cmd));
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
