#!/usr/bin/env node
// cli.js

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs'); 
const { spawn } = require('child_process');

const ConfigResolver = require('./src/ConfigResolver');
const PluginManager = require('./src/PluginManager');
const HugoExportEach = require('./src/hugo_export_each');
const { setupWatch } = require('./src/watch_handler');
const PluginRegistryBuilder = require('./src/PluginRegistryBuilder');
const { scaffoldPlugin } = require('./src/plugin_scaffolder'); 

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
        const configResolver = new ConfigResolver(args.config, args.factoryDefaults); 

        if (args.watch) {
            await setupWatch(args, configResolver, 
                async (watchedArgs) => { 
                    const currentConfigResolver = new ConfigResolver(watchedArgs.config, watchedArgs.factoryDefaults);
                    await executorFunction(watchedArgs, currentConfigResolver);
                }
            );
        } else {
            await executorFunction(args, configResolver);
            console.log(`${commandType} command finished.`);
        }
    } catch (error) {
        const pluginNameForError = args.plugin || args.pluginName || 'N/A';
        console.error(`ERROR in '${commandType}' command for plugin '${pluginNameForError}': ${error.message}`);
        if (error.stack && !args.watch) console.error(error.stack);
        if (!args.watch) process.exit(1);
    }
}

async function executeConversion(args, configResolver) {
    console.log(`Processing 'convert' for: ${args.markdownFile} using plugin: ${args.plugin}`);
    
    const effectiveConfig = await configResolver.getEffectiveConfig(args.plugin);
    const mainLoadedConfig = effectiveConfig.mainConfig;

    const resolvedMarkdownPath = path.resolve(args.markdownFile);
    const outputDir = args.outdir ? path.resolve(args.outdir) : path.dirname(resolvedMarkdownPath);
    const dataForPlugin = { markdownFilePath: resolvedMarkdownPath };

    const pluginManager = new PluginManager();
    const generatedPdfPath = await pluginManager.invokeHandler(
        args.plugin,
        effectiveConfig,
        dataForPlugin,
        outputDir,
        args.filename
    );

    if (generatedPdfPath) {
        console.log(`Successfully generated PDF: ${generatedPdfPath}`);
        const viewer = mainLoadedConfig.pdf_viewer;
        if (args.open && viewer) {
            openPdf(generatedPdfPath, viewer);
        } else if (args.open && !viewer) {
            console.log(`PDF viewer not configured in main config. PDF is at: ${generatedPdfPath}`);
        } 
    } else {
        if (!args.watch) throw new Error(`PDF generation failed for plugin '${args.plugin}'.`);
    }
}

async function executeGeneration(args, configResolver) {
    console.log(`Processing 'generate' command for plugin: ${args.pluginName}`);

    const effectiveConfig = await configResolver.getEffectiveConfig(args.pluginName);
    const mainLoadedConfig = effectiveConfig.mainConfig;

    const knownGenerateOptions = ['pluginName', 'outdir', 'o', 'filename', 'f', 'open', 'watch', 'w', 'config', 'help', 'h', 'version', 'v', '$0', '_', 'factoryDefaults', 'factoryDefault', 'fd'];
    const cliArgsForPlugin = {};
    for (const key in args) {
        if (!knownGenerateOptions.includes(key) && Object.prototype.hasOwnProperty.call(args, key)) {
            cliArgsForPlugin[key] = args[key];
        }
    }

    const dataForPlugin = { cliArgs: cliArgsForPlugin };
    const outputFilename = args.filename;
    const outputDir = path.resolve(args.outdir);

    const pluginManager = new PluginManager();
    const generatedPdfPath = await pluginManager.invokeHandler(
        args.pluginName,
        effectiveConfig,
        dataForPlugin,
        outputDir,
        outputFilename
    );

    if (generatedPdfPath) {
        console.log(`Successfully generated PDF via plugin '${args.pluginName}': ${generatedPdfPath}`);
        const viewer = mainLoadedConfig.pdf_viewer;
        if (args.open && viewer) {
            openPdf(generatedPdfPath, viewer);
        } else if (args.open && !viewer) {
            console.log(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
        }
    } else {
        if (!args.watch) throw new Error(`PDF generation failed for plugin '${args.pluginName}'.`);
    }
}

async function main() {
    const argvBuilder = yargs(hideBin(process.argv))
        .parserConfiguration({'short-option-groups': false}) 
        .scriptName("md-to-pdf")
        .usage("Usage: $0 <command> [options]")
        .option('config', {
            describe: 'Path to a custom YAML configuration file.',
            type: 'string',
            normalize: true,
        })
        .option('factory-defaults', { 
            alias: ['factory-default', 'fd'], 
            describe: 'Use only bundled default configurations, ignoring user (XDG) and project (--config) overrides.',
            type: 'boolean',
            default: false,
        })
        .alias("help", "h")
        .alias("version", "v")
        .demandCommand(1, "You need to specify a command.")
        .strict()
        .epilogue("For more information, refer to the README.md file.");

    argvBuilder.command(
            "convert <markdownFile>",
            "Convert a single Markdown file to PDF using a specified plugin.",
            (y) => { 
                y.positional("markdownFile", { describe: "Path to the input Markdown file.", type: "string" })
                .option("plugin", { alias: "p", describe: "Plugin to use.", type: "string", default: "default" })
                .option("outdir", { alias: "o", describe: "Output directory.", type: "string" })
                .option("filename", { alias: "f", describe: "Output PDF filename.", type: "string" })
                .option("open", { describe: "Open PDF after generation.", type: "boolean", default: true })
                .option("watch", { alias: "w", describe: "Watch for changes.", type: "boolean", default: false });
            },
            (args) => commonCommandHandler(args, executeConversion, 'convert')
        )
        .command(
            "generate <pluginName>",
            "Generate a document using a specified plugin.",
            (y) => { 
                y.positional("pluginName", { describe: "Name of the plugin.", type: "string"})
                .option("outdir", { alias: "o", describe: "Output directory.", type: "string", default: "."})
                .option("filename", { alias: "f", describe: "Output PDF filename.", type: "string" }) 
                .option("open", { describe: "Open PDF after generation.", type: "boolean", default: true})
                .option("watch", { alias: "w", describe: "Watch for changes.", type: "boolean", default: false});
                y.strict(false); // Allows plugin-specific options
            },
            (args) => commonCommandHandler(args, executeGeneration, 'generate')
        )
        .command(
            "hugo-export-each <sourceDir>",
            "Batch export PDFs from a Hugo content directory.",
            (y) => { 
                y.positional("sourceDir", { describe: "Hugo content source directory.", type: "string"})
                .option("base-plugin", { alias: "p", describe: "Base plugin for styling.", type: "string", default: "recipe"})
                .option("hugo-ruleset", { describe: "Ruleset from config.yaml.", type: "string", default: "default_rules"})
                .option("open", { describe: "Open the first PDF.", type: "boolean", default: false });
            },
            async (args) => { 
                try {
                    console.log(`Processing 'hugo-export-each' for dir: ${args.sourceDir} using base plugin: ${args.basePlugin}`);
                    const configResolver = new ConfigResolver(args.config, args.factoryDefaults); 
                    
                    const effectiveBasePluginConfigDetails = await configResolver.getEffectiveConfig(args.basePlugin);
                    if (!effectiveBasePluginConfigDetails) {
                        throw new Error(`Base plugin '${args.basePlugin}' could not be resolved by ConfigResolver.`);
                    }

                    const mainLoadedConfig = effectiveBasePluginConfigDetails.mainConfig;
                    const hugoExportRules = (mainLoadedConfig.hugo_export_each && mainLoadedConfig.hugo_export_each[args.hugoRuleset])
                        ? mainLoadedConfig.hugo_export_each[args.hugoRuleset]
                        : {};
                    
                    const exporter = new HugoExportEach();
                    const generatedPdfPaths = await exporter.exportAllPdfs(
                        path.resolve(args.sourceDir),
                        effectiveBasePluginConfigDetails.pluginSpecificConfig,
                        hugoExportRules,
                        mainLoadedConfig,
                        !args.open,
                        effectiveBasePluginConfigDetails.pluginBasePath
                    );

                    const viewer = mainLoadedConfig.pdf_viewer;
                    if (args.open && viewer && generatedPdfPaths.length > 0) {
                        openPdf(generatedPdfPaths[0], viewer);
                    } else if (args.open && !viewer && generatedPdfPaths.length > 0){
                        console.log(`PDF viewer not configured. First PDF is at: ${generatedPdfPaths[0]}`);
                    }
                    console.log("Hugo export-each command finished.");
                } catch (error) {
                    console.error(`ERROR in 'hugo-export-each' command: ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
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
                                path.resolve(__dirname), 
                                null, 
                                args.config, 
                                args.factoryDefaults
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
                            // console.log(`Executing 'plugin create' for: ${args.pluginName}`); // Moved to scaffolder
                            const success = await scaffoldPlugin(args.pluginName, args.dir, args.force);
                            if (success) {
                                // console.log(`Plugin boilerplate for '${args.pluginName}' creation successful.`); // Scaffolder logs this
                            } else {
                                // console.error(`Failed to create plugin boilerplate for '${args.pluginName}'.`); // Scaffolder logs this
                                process.exit(1); // Ensure exit with error code if scaffoldPlugin returns false
                            }
                        } catch (error) {
                            console.error(`ERROR during 'plugin create ${args.pluginName}': ${error.message}`);
                            if (error.stack) console.error(error.stack);
                            process.exit(1);
                        }
                    }
                )
                .demandCommand(1, "You need to specify a plugin subcommand (e.g., list, create).");
            }
        );


    const parsedArgs = await argvBuilder.argv; 
    if (!parsedArgs._[0] && Object.keys(parsedArgs).length <= 2) { 
        argvBuilder.showHelp();
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
