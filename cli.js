#!/usr/bin/env node

// cli.js

/**
 * @fileoverview Command Line Interface (CLI) entry point for the md-to-pdf application.
 * @version 1.5.1 // Version bump for yargs strictness fix in generate
 * @date 2025-05-18
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const { spawn } = require('child_process');

const {
    loadConfig,
} = require('./src/markdown_utils');

const PluginManager = require('./src/PluginManager');
const HugoExportEach = require('./src/hugo_export_each');

const DEFAULT_CONFIG_FILE_PATH = path.join(__dirname, 'config.yaml');

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

async function main() {
    const argvBuilder = yargs(hideBin(process.argv))
        .scriptName("md-to-pdf")
        .usage("Usage: $0 <command> [options]")
        .option('config', {
            describe: 'Path to a custom YAML configuration file.',
            type: 'string',
            normalize: true,
            default: DEFAULT_CONFIG_FILE_PATH
        })
        .alias("help", "h")
        .alias("version", "v")
        .demandCommand(1, "You need to specify a command.")
        .strict() // Global strict mode
        .epilogue("For more information, refer to the README.md file.");

    argvBuilder.command(
            "convert <markdownFile>",
            "Convert a single Markdown file to PDF using a specified plugin.",
            (y) => {
                y.positional("markdownFile", {
                    describe: "Path to the input Markdown file.",
                    type: "string",
                    normalize: true,
                })
                .option("plugin", {
                    alias: "p",
                    describe: "Document type plugin to use (e.g., 'default', 'cv', 'recipe').",
                    type: "string",
                    default: "default",
                })
                .option("outdir", {
                    alias: "o",
                    describe: "Output directory for the PDF. Defaults to input file's directory.",
                    type: "string",
                    normalize: true,
                })
                .option("filename", {
                    alias: "f",
                    describe: "Specific name for the output PDF file. If not provided, a name will be generated.",
                    type: "string",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDF.",
                    type: "boolean",
                    default: false,
                });
            },
            async (args) => {
                let fullConfig;
                try {
                    fullConfig = await loadConfig(args.config);
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                try {
                    console.log(`Processing 'convert' for: ${args.markdownFile} using plugin: ${args.plugin}`);
                    const pluginManager = new PluginManager(fullConfig);
                    const outputDir = args.outdir ? path.resolve(args.outdir) : path.dirname(args.markdownFile);
                    const dataForPlugin = { markdownFilePath: args.markdownFile };
                    
                    const generatedPdfPath = await pluginManager.invokeHandler(
                        args.plugin, dataForPlugin, outputDir, args.filename
                    );

                    if (generatedPdfPath) {
                        console.log(`Successfully generated PDF: ${generatedPdfPath}`);
                        if (!args.noOpen && fullConfig.pdf_viewer) {
                            openPdf(generatedPdfPath, fullConfig.pdf_viewer);
                        } else if (!args.noOpen) {
                            console.log(`PDF viewer not configured in main config. PDF is at: ${generatedPdfPath}`);
                        }
                    } else {
                        console.error(`ERROR: PDF generation failed for plugin '${args.plugin}'.`);
                        process.exit(1);
                    }
                    console.log("Convert command finished.");
                } catch (error) {
                    console.error(`ERROR in 'convert' command: ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
            }
        )
        .command(
            "generate <pluginName>",
            "Generate a document using a specified plugin and its specific options.",
            (y) => {
                y.positional("pluginName", {
                    describe: "The name of the plugin to use.",
                    type: "string",
                })
                .option("outdir", {
                    alias: "o",
                    describe: "Output directory for the PDF. Defaults to current directory.",
                    type: "string",
                    default: ".",
                    normalize: true,
                })
                .option("filename", {
                    alias: "f",
                    describe: "Specific name for the output PDF file. If not provided, a name will be generated by the plugin.",
                    type: "string",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDF.",
                    type: "boolean",
                    default: false,
                })
                .strict(false); // <--- FIX: Disable strictness for this command's options
            },
            async (args) => {
                let fullConfig;
                try {
                    fullConfig = await loadConfig(args.config);
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                try {
                    console.log(`Processing 'generate' command for plugin: ${args.pluginName}`);
                    const pluginManager = new PluginManager(fullConfig);

                    const knownGenerateOptions = ['pluginName', 'outdir', 'o', 'filename', 'f', 'noOpen', 'config', 'help', 'h', 'version', 'v', '$0', '_'];
                    const cliArgsForPlugin = {};
                    for (const key in args) {
                        if (!knownGenerateOptions.includes(key) && Object.prototype.hasOwnProperty.call(args, key)) {
                            // Yargs converts kebab-case to camelCase, so --recipes-base-dir becomes recipesBaseDir in args
                            cliArgsForPlugin[key] = args[key];
                        }
                    }
                    
                    const dataForPlugin = { cliArgs: cliArgsForPlugin };
                    const outputFilename = args.filename;

                    const generatedPdfPath = await pluginManager.invokeHandler(
                        args.pluginName,
                        dataForPlugin,
                        path.resolve(args.outdir),
                        outputFilename
                    );

                    if (generatedPdfPath) {
                        console.log(`Successfully generated PDF via plugin '${args.pluginName}': ${generatedPdfPath}`);
                        if (!args.noOpen && fullConfig.pdf_viewer) {
                            openPdf(generatedPdfPath, fullConfig.pdf_viewer);
                        } else if (!args.noOpen) {
                            console.log(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
                        }
                    } else {
                        console.error(`ERROR: PDF generation failed for plugin '${args.pluginName}'.`);
                        process.exit(1);
                    }
                    console.log("Generate command finished.");
                } catch (error) {
                    console.error(`ERROR in 'generate' command for plugin '${args.pluginName}': ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
            }
        )
        .command(
            "hugo-export-each <sourceDir>",
            "Batch export individual PDFs from a Hugo content directory.",
            (y) => {
                y.positional("sourceDir", {
                    describe: "Path to the source directory containing Hugo recipes.",
                    type: "string",
                    normalize: true,
                })
                .option("base-plugin", { // Corrected option name definition
                    alias: "p",
                    describe: "Base document type plugin to use for styling each item (e.g., 'recipe').",
                    type: "string",
                    default: "recipe",
                })
                .option("hugo-ruleset", {
                    describe: "Key in config.yaml under 'hugo_export_each' for specific processing rules.",
                    type: "string",
                    default: "default_rules",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDFs.",
                    type: "boolean",
                    default: true,
                });
            },
            async (args) => {
                let fullConfig;
                try {
                    fullConfig = await loadConfig(args.config);
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                try {
                    console.log(`Processing 'hugo-export-each' for dir: ${args.sourceDir} using base plugin: ${args.basePlugin}`);
                    const pluginManager = new PluginManager(fullConfig);
                    const pluginDetails = await pluginManager.getPluginDetails(args.basePlugin);

                    if (!pluginDetails || !pluginDetails.config) {
                        throw new Error(`Base plugin '${args.basePlugin}' not found or its configuration failed to load.`);
                    }
                    const itemBasePluginConfig = pluginDetails.config;
                    const itemBasePluginPath = pluginDetails.basePath;

                    const hugoExportRules = (fullConfig.hugo_export_each && fullConfig.hugo_export_each[args.hugoRuleset])
                        ? fullConfig.hugo_export_each[args.hugoRuleset]
                        : {};
                    
                    const exporter = new HugoExportEach();
                    const generatedPdfPaths = await exporter.exportAllPdfs(
                        args.sourceDir,
                        itemBasePluginConfig,
                        hugoExportRules,
                        fullConfig,
                        args.noOpen,
                        itemBasePluginPath
                    );

                    if (!args.noOpen && fullConfig.pdf_viewer && generatedPdfPaths.length > 0) {
                        openPdf(generatedPdfPaths[0], fullConfig.pdf_viewer);
                    }
                    console.log("Hugo export-each command finished.");
                } catch (error) {
                    console.error(`ERROR in 'hugo-export-each' command: ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
            }
        );

    const parsedArgs = argvBuilder.parse();
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
