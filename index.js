// index.js
// Main module entry point for oshea - API and Engine

require('module-alias')(__dirname);

const os = require('os');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const {
  defaultHandlerPath,
  markdownUtilsPath,
  pdfGeneratorPath,
  configResolverPath,
  pluginManagerPath,
  pluginRegistryBuilderPath,
  loggerPath,
  watchHandlerPath,
  pluginDeterminerPath,
} = require('@paths');

const DefaultHandler = require(defaultHandlerPath);
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);
const ConfigResolver = require(configResolverPath);
const PluginManager = require(pluginManagerPath);
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);
const logger = require(loggerPath);
const { setupWatch } = require(watchHandlerPath);
const { determinePluginToUse } = require(pluginDeterminerPath);

// Business Logic Functions (moved from cli.js)

function openPdf(pdfPath, viewerCommand) {
  if (!viewerCommand) {
    logger.warn(`PDF viewer not configured. PDF generated at: ${pdfPath}`);
    return;
  }
  logger.info(`Attempting to open PDF "${pdfPath}" with: ${viewerCommand}`);
  try {
    const [command, ...args] = viewerCommand.split(' ');
    const viewerProcess = spawn(command, [...args, pdfPath], {
      detached: true,
      stdio: 'ignore',
    });
    viewerProcess.on('error', (err) => {
      logger.warn(`WARN: Failed to start PDF viewer '${viewerCommand}': ${err.message}.`);
      logger.warn(`Please open "${pdfPath}" manually.`);
    });
    viewerProcess.unref();
  } catch (e) {
    logger.warn(`WARN: Error trying to open PDF with '${viewerCommand}': ${e.message}.`);
    logger.warn(`Please open "${pdfPath}" manually.`);
  }
}

async function commonCommandHandler(args, executorFunction, commandType) {
  try {
    if (args.watch) {
      await setupWatch(args, null,
        async (watchedArgs) => {
          const currentConfigResolver = new ConfigResolver(watchedArgs.config, watchedArgs.factoryDefaults, watchedArgs.isLazyLoad || false, { collRoot: watchedArgs.manager.collRoot, collectionsManager: watchedArgs.manager });
          await executorFunction(watchedArgs, currentConfigResolver);
        }
      );
    } else {
      await executorFunction(args, args.configResolver);
    }
  } catch (error) {
    const pluginNameForError = args.pluginSpec || args.plugin || args.pluginName || 'N/A';
    logger.error(`ERROR in '${commandType}' command for plugin '${pluginNameForError}': ${error.message}`);
    if (error.stack && !args.watch) logger.error(error.stack);
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

  logger.info(`Processing 'convert' for: ${args.markdownFile}`);

  const resolvedMarkdownPath = path.resolve(args.markdownFile);

  const effectiveConfig = await configResolver.getEffectiveConfig(pluginSpec, localConfigOverrides, resolvedMarkdownPath);
  const mainLoadedConfig = effectiveConfig.mainConfig;

  let outputDir;
  if (args.outdir) {
    outputDir = path.resolve(args.outdir);
  } else {
    outputDir = path.join(os.tmpdir(), 'oshea-output');
    if (!(args.isLazyLoad && pluginSource !== 'CLI option')) {
      logger.info(`No output directory specified. Defaulting to temporary directory: ${outputDir}`);
    }
  }

  if (!fs.existsSync(outputDir)) {
    await fsp.mkdir(outputDir, { recursive: true });
    if (!(args.isLazyLoad && pluginSource !== 'CLI option')) {
      logger.info(`Created output directory: ${outputDir}`);
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
    logger.success(`Successfully generated PDF with plugin '${pluginSpec}': ${generatedPdfPath}`);
    const viewer = mainLoadedConfig.pdf_viewer;
    if (args.open && viewer) {
      openPdf(generatedPdfPath, viewer);
    } else if (args.open && !viewer) {
      logger.warn(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
    } else if (!args.open && !args.outdir) {
      logger.info(`PDF saved to temporary directory: ${generatedPdfPath}`);
    }
  } else {
    if (!args.watch) throw new Error(`PDF generation failed for plugin '${pluginSpec}' (determined via ${pluginSource}).`);
  }
  logger.detail('convert command finished.');
}

async function executeGeneration(args, configResolver) {
  const pluginToUse = args.pluginName;
  args.pluginSpec = pluginToUse;
  logger.info(`Processing 'generate' command for plugin: ${pluginToUse}`);

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
    logger.info(`Created output directory: ${outputDir}`);
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
    logger.success(`Successfully generated PDF via plugin '${pluginToUse}': ${generatedPdfPath}`);
    const viewer = mainLoadedConfig.pdf_viewer;
    if (args.open && viewer) {
      openPdf(generatedPdfPath, viewer);
    } else if (args.open && !viewer) {
      logger.warn(`PDF viewer not configured. PDF is at: ${generatedPdfPath}`);
    } else if (!args.open && !args.outdir) {
      logger.info(`PDF saved to temporary directory: ${generatedPdfPath}`);
    }
  } else {
    if (!args.watch) throw new Error(`PDF generation failed for plugin '${pluginToUse}'.`);
  }
  logger.detail('generate command finished.');
}

// API and Engine exports
module.exports = {
  // Core handlers and utilities
  DefaultHandler,
  markdownUtils,
  pdfGenerator,

  // Core system components
  ConfigResolver,
  PluginManager,
  PluginRegistryBuilder,

  // Engine functions (moved from cli.js)
  openPdf,
  commonCommandHandler,
  executeConversion,
  executeGeneration,
};
