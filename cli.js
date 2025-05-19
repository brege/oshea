#!/usr/bin/env node

// cli.js

/**
 * @fileoverview Command Line Interface (CLI) entry point for the md-to-pdf application.
 * Handles argument parsing, configuration loading, and delegates tasks to appropriate modules
 * for Markdown to PDF conversion, recipe book generation, and Hugo content processing.
 * @version 1.2.0 // Version bump for --config fix
 * @date 2025-05-18
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const { spawn } = require('child_process');

const {
    loadConfig,
    getTypeConfig,
} = require('./src/markdown_utils');

const DocumentProcessor = require('./src/document_processor');
const RecipeBookBuilder = require('./src/recipe_book_builder');
const HugoExportEach = require('./src/hugo_export_each');

// Default config path, used if --config option is not provided
const DEFAULT_CONFIG_FILE_PATH = path.join(__dirname, 'config.yaml');

/**
 * Attempts to open a generated PDF file using the configured PDF viewer.
 * Logs a message if a viewer is not configured or if opening fails.
 * The viewer is spawned as a detached process.
 *
 * @param {string} pdfPath - The absolute path to the PDF file.
 * @param {string} viewerCommand - The command string for the PDF viewer (e.g., "firefox", "xdg-open").
 */
function openPdf(pdfPath, viewerCommand) {
    // ... (openPdf function remains the same)
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

/**
 * Main application function. Parses CLI arguments, loads configuration,
 * and executes the requested command.
 * @async
 */
async function main() {
    // Define global options first
    const argvBuilder = yargs(hideBin(process.argv))
        .scriptName("md-to-pdf")
        .usage("Usage: $0 <command> [options]")
        .option('config', { // <<< DEFINE --config AS A GLOBAL OPTION
            describe: 'Path to a custom YAML configuration file.',
            type: 'string',
            normalize: true, // Ensures the path is normalized
            default: DEFAULT_CONFIG_FILE_PATH // Use default if not provided
        })
        .alias("help", "h")
        .alias("version", "v")
        .demandCommand(1, "You need to specify a command (convert, book, or hugo-export-each).")
        .strict() // Catches unrecognized options (like --config if not defined globally)
        .epilogue("For more information, refer to the README.md file.");

    // Now add commands, they will inherit the global options
    argvBuilder.command(
            "convert <markdownFile>",
            "Convert a single Markdown file to PDF.",
            (y) => { // Command-specific options
                y.positional("markdownFile", {
                    describe: "Path to the input Markdown file.",
                    type: "string",
                    normalize: true,
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
                .option("type", {
                    alias: "t",
                    describe: "Document type (e.g., 'cv', 'recipe', 'default'). Determines configuration and CSS.",
                    type: "string",
                    default: "default",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDF.",
                    type: "boolean",
                    default: false,
                });
            },
            async (args) => { // Handler for 'convert'
                let fullConfig;
                try {
                    // Use args.config which yargs has now populated
                    fullConfig = await loadConfig(args.config);
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                // ... rest of the convert handler logic ...
                try {
                    console.log(`Processing 'convert' command for: ${args.markdownFile}`);
                    const docTypeConfig = getTypeConfig(fullConfig, args.type);
                    const outputDir = args.outdir || path.dirname(args.markdownFile);

                    const processor = new DocumentProcessor();
                    const generatedPdfPath = await processor.process(
                        args.markdownFile,
                        docTypeConfig,
                        outputDir,
                        args.filename,
                        fullConfig
                    );

                    if (generatedPdfPath && !args.noOpen && docTypeConfig.pdf_viewer) {
                        openPdf(generatedPdfPath, docTypeConfig.pdf_viewer);
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
            "book <recipesBaseDir>",
            "Create a recipe book PDF from a directory of recipes.",
            (y) => { // Command-specific options
                y.positional("recipesBaseDir", {
                    describe: "Base directory containing recipe Markdown files/subdirectories.",
                    type: "string",
                    normalize: true,
                })
                .option("outdir", {
                    alias: "o",
                    describe: "Output directory for the recipe book PDF. Defaults to current directory.",
                    type: "string",
                    default: ".",
                    normalize: true,
                })
                .option("filename", {
                    alias: "f",
                    describe: "Specific name for the output PDF file.",
                    type: "string",
                    default: "recipe-book.pdf",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDF.",
                    type: "boolean",
                    default: false,
                });
            },
            async (args) => { // Handler for 'book'
                let fullConfig;
                try {
                    fullConfig = await loadConfig(args.config); // Use args.config
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                // ... rest of the book handler logic ...
                try {
                    console.log(`Processing 'book' command for directory: ${args.recipesBaseDir}`);
                    const recipeBookConfig = getTypeConfig(fullConfig, 'recipe-book');

                    const builder = new RecipeBookBuilder();
                    const generatedPdfPath = await builder.build(
                        args.recipesBaseDir,
                        recipeBookConfig,
                        args.outdir,
                        args.filename
                    );

                    if (generatedPdfPath && !args.noOpen && recipeBookConfig.pdf_viewer) {
                        openPdf(generatedPdfPath, recipeBookConfig.pdf_viewer);
                    }
                    console.log("Book command finished.");
                } catch (error) {
                    console.error(`ERROR in 'book' command: ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
            }
        )
        .command(
            "hugo-export-each <sourceDir>",
            "Batch export individual PDFs from a Hugo content directory (slug-author-date.pdf naming).",
            (y) => { // Command-specific options
                y.positional("sourceDir", {
                    describe: "Path to the source directory containing Hugo recipes (e.g., 'content/recipes').",
                    type: "string",
                    normalize: true,
                })
                .option("base-type", {
                    alias: "t", // Changed from 'itemBaseType' in yargs to 'base-type' to match common CLI style
                    describe: "Base document type from config.yaml to use for styling each item (e.g., 'recipe').",
                    type: "string",
                    default: "recipe",
                })
                .option("hugo-ruleset", { // Changed from 'hugoRuleset'
                    describe: "Key in config.yaml under 'hugo_export_each' for specific processing rules (e.g., 'default_rules').",
                    type: "string",
                    default: "default_rules",
                })
                .option("no-open", {
                    describe: "Prevents automatically opening the generated PDFs.",
                    type: "boolean",
                    default: true,
                });
            },
            async (args) => { // Handler for 'hugo-export-each'
                let fullConfig;
                try {
                    fullConfig = await loadConfig(args.config); // Use args.config
                } catch (error) {
                    console.error(`ERROR: Failed to load configuration from '${args.config}': ${error.message}`);
                    process.exit(1);
                }
                // ... rest of the hugo-export-each handler logic ...
                try {
                    console.log(`Processing 'hugo-export-each' command for directory: ${args.sourceDir}`);
                    const itemBaseConfig = getTypeConfig(fullConfig, args.baseType); // args.baseType is correct from yargs
                    
                    const hugoExportRules = (fullConfig.hugo_export_each && fullConfig.hugo_export_each[args.hugoRuleset]) // args.hugoRuleset
                        ? fullConfig.hugo_export_each[args.hugoRuleset]
                        : {};

                    if (Object.keys(hugoExportRules).length === 0 && args.hugoRuleset !== "default_rules" && fullConfig.hugo_export_each && !fullConfig.hugo_export_each[args.hugoRuleset]) {
                        console.warn(`WARN: Hugo export ruleset '${args.hugoRuleset}' not found under 'hugo_export_each' in config.yaml. Using minimal/default Hugo processing rules.`);
                    } else if (Object.keys(hugoExportRules).length === 0 && args.hugoRuleset === "default_rules" && (!fullConfig.hugo_export_each || !fullConfig.hugo_export_each.default_rules)) {
                        console.warn(`WARN: Default Hugo export ruleset 'default_rules' not found under 'hugo_export_each' in config.yaml. Minimal Hugo processing will occur.`);
                    }

                    const exporter = new HugoExportEach();
                    const generatedPdfPaths = await exporter.exportAllPdfs(
                        args.sourceDir,
                        itemBaseConfig,
                        hugoExportRules,
                        fullConfig,
                        args.noOpen
                    );

                    if (!args.noOpen && itemBaseConfig.pdf_viewer && generatedPdfPaths.length > 0) {
                        console.log("Batch export finished. Attempting to open the first generated PDF as per --no-open=false.");
                        openPdf(generatedPdfPaths[0], itemBaseConfig.pdf_viewer);
                    } else if (!args.noOpen && !itemBaseConfig.pdf_viewer && generatedPdfPaths.length > 0) {
                        console.log("Batch export finished. PDFs generated but cannot be opened (no PDF viewer configured for type).")
                    }
                    console.log("Hugo export-each command finished.");
                } catch (error) {
                    console.error(`ERROR in 'hugo-export-each' command: ${error.message}`);
                    if (error.stack) console.error(error.stack);
                    process.exit(1);
                }
            }
        );

    // Parse the arguments after all commands and options are defined.
    // Yargs will populate `args` in each handler with both global and command-specific options.
    const parsedArgs = argvBuilder.parse();

    // Note: The actual command execution logic is now within each command's handler.
    // The `loadConfig` call is moved into each handler to use `args.config`.
    // If `loadConfig` was intended to be called only once, you'd parse earlier,
    // load config, and then pass `fullConfig` into the handlers. But since `--config`
    // is now a dynamic option, loading it inside the handler based on `args.config` is correct.
}

// --- Global Error Handling ---
// ... (remains the same)
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

// --- Script Execution ---
if (require.main === module) {
    main();
}
