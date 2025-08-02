#!/usr/bin/env node
// cli.js

require('module-alias')(__dirname);

const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');

const {
  loggerPath,
  configResolverPath,
  pluginManagerPath,
  watchHandlerPath,
  pluginDeterminerPath,
  collectionsIndexPath,
  mainConfigLoaderPath,
  markdownUtilsPath,
  configCommandPath,
  pluginCommandPath,
  convertCommandPath,
  generateCommandPath,
  collectionCommandPath,
  updateCommandPath,
  enginePath,
} = require('@paths');
const logger = require(loggerPath);


const argvRaw = hideBin(process.argv);
const isCompletionScriptGeneration = argvRaw.includes('completion') && !argvRaw.includes('--get-yargs-completions');

// This block is a special case for shell completion.
if (argvRaw.includes('--get-yargs-completions') && !isCompletionScriptGeneration) {
  const { getSuggestions } = require(enginePath);

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
  // lint-skip-next-line no-console
  console.log(suggestions.join('\n'));
  process.exit(0);
}


const os = require('os');
const fsp = require('fs').promises;
const { spawn, execSync } = require('child_process');

const ConfigResolver = require(configResolverPath);
const PluginManager = require(pluginManagerPath);
const { setupWatch } = require(watchHandlerPath);
const { determinePluginToUse } = require(pluginDeterminerPath);
const CollectionsManager = require(collectionsIndexPath);
const MainConfigLoader = require(mainConfigLoaderPath);
const markdownUtils = require(markdownUtilsPath);
const yaml = require('js-yaml');

const yargs = require('yargs/yargs');

const configCommand = require(configCommandPath);
const pluginCommand = require(pluginCommandPath);
const convertCommandModule = require(convertCommandPath);
const generateCommand = require(generateCommandPath);
const collectionCommand = require(collectionCommandPath);
const updateCommand = require(updateCommandPath);


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
    outputDir = path.join(os.tmpdir(), 'md-to-pdf-output');
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
    }
  } else {
    if (!args.watch) throw new Error(`PDF generation failed for plugin '${pluginToUse}'.`);
  }
  logger.detail('generate command finished.');
}

async function main() {
  let managerInstance;

  const argvBuilder = yargs(hideBin(process.argv))
    .parserConfiguration({ 'short-option-groups': false })
    .scriptName('md-to-pdf')
    .usage('Usage: $0 <command_or_markdown_file> [options]')
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
    })
    .option('debug', {
      describe: 'enable detailed debug output with enhanced logging (use --debug=stack for stack traces)',
      type: 'string',
      default: false,
      coerce: (value) => {
        // Handle --debug (boolean) and --debug=value (string)
        if (value === true || value === 'true' || value === '') return true;
        return value;
      }
    });

  argvBuilder.middleware(async (argv) => {
    // Configure enhanced debugging if --debug flag is used
    if (argv.debug) {
      logger.setDebugMode(true);

      const debugConfig = {
        showCaller: true,
        enrichErrors: true,
        showStack: false
      };

      // Enable stack traces for --debug=stack
      if (argv.debug === 'stack' || argv.debug === 'trace') {
        debugConfig.showStack = true;
      }

      logger.configureLogger(debugConfig);
    }

    const mainConfigLoader = new MainConfigLoader(path.resolve(__dirname, '..'), argv.config, argv.factoryDefaults);
    const primaryConfig = await mainConfigLoader.getPrimaryMainConfig();
    const collRootFromMainConfig = primaryConfig.config.collections_root || null;
    const collRootCliOverride = argv['coll-root'] || null;

    managerInstance = new CollectionsManager({
      debug: argv.debug || process.env.DEBUG_CM === 'true',
      collRootFromMainConfig: collRootFromMainConfig,
      collRootCliOverride: collRootCliOverride
    });

    argv.manager = managerInstance;

    const configResolver = new ConfigResolver(
      argv.config,
      argv.factoryDefaults,
      false,
      { collRoot: managerInstance.collRoot, collectionsManager: managerInstance }
    );
    argv.configResolver = configResolver;
  });

  argvBuilder.completion();

  argvBuilder.command({
    command: '_tab_cache',
    describe: false,
    builder: (yargsCommand) => {
      yargsCommand.option('config', { type: 'string' })
        .option('coll-root', { type: 'string' });
    },
    handler: (args) => {
      const {
        generateCompletionCachePath,
        generateCompletionDynamicCachePath
      } = require('@paths');

      try {
        // Regenerate static command tree cache
        execSync(`node "${generateCompletionCachePath}"`, { stdio: 'inherit', env: { ...process.env, DEBUG: args.debug } });

        // Regenerate dynamic completion data cache
        execSync(`node "${generateCompletionDynamicCachePath}"`, { stdio: 'inherit', env: { ...process.env, DEBUG: args.debug } });
      } catch (error) {
        logger.error(`ERROR: Cache generation failed: ${error.message}`);
        process.exit(1);
      }
    }
  });

  argvBuilder
    .command({
      ...convertCommandModule.defaultCommand,
      handler: async (args) => {
        const potentialFile = args.markdownFile;
        if (potentialFile) {
          if (!fs.existsSync(potentialFile) && !potentialFile.endsWith('.md') && !potentialFile.endsWith('.mdx')) {
            logger.error(`Error: Unknown command: '${potentialFile}'`);
            logger.warn('\nTo convert a file, provide a valid path. For other commands, see --help.');
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
      ...convertCommandModule.explicitConvert,
      handler: async (args) => {
        args.isLazyLoad = false;
        await commonCommandHandler(args, executeConversion, 'convert (explicit)');
      }
    })
    .command({
      ...generateCommand,
      handler: async (args) => {
        args.isLazyLoad = false;
        await commonCommandHandler(args, executeGeneration, 'generate');
      }
    })
    .command(pluginCommand)
    .command(collectionCommand)
    .command(updateCommand)
    .command(configCommand)
    .alias('h', 'help')
    .alias('v', 'version')
    .strictCommands()
    .fail((msg, err, yargsInstance) => {
      if (err) {
        logger.error(msg || err.message);
        if (process.env.DEBUG_CM === 'true' && err.stack) logger.error(err.stack);
        yargsInstance.showHelp();
        process.exit(1);
        return;
      }
      if (msg && msg.includes('Unknown argument')) {
        const firstArg = process.argv[2];
        if(firstArg && !['convert', 'generate', 'plugin', 'config', 'collection', 'update', 'up', '--help', '-h', '--version', '-v', '--config', '--factory-defaults', '--coll-root'].includes(firstArg) && (fs.existsSync(path.resolve(firstArg)) || firstArg.endsWith('.md'))){
          logger.error(`ERROR: ${msg}`);
          logger.warn(`\nIf you intended to convert '${firstArg}', ensure all options are valid for the convert command or the default command.`);
          yargsInstance.showHelp();
          process.exit(1);
          return;
        }
      }
      logger.error(msg || 'An error occurred.');
      if (msg) logger.warn('For usage details, run with --help.');
      process.exit(1);
    })
    .epilogue(
      'For more information, refer to the README.md file.\n' +
            'Tab-completion Tip:\n' +
            '   echo \'source <(md-to-pdf completion)\' >> ~/.bashrc\n' +
            '   echo \'source <(md-to-pdf completion)\' >> ~/.zshrc\n' +
            'then run `source ~/.bashrc` or `source ~/.zshrc`'
    );

  await argvBuilder.argv;
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  if (reason instanceof Error && reason.stack) {
    logger.error(reason.stack);
  }
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  if (error.stack) {
    logger.error(error.stack);
  }
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { openPdf };
