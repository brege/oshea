#!/usr/bin/env node
// cli.js

require('module-alias/register');
require('module-alias')(__dirname);

const { hideBin } = require('yargs/helpers');
const path = require('path');
const fs = require('fs');

const {
  packageJsonPath,
  loggerPath,
  configFormatterPath,
  configResolverPath,
  collectionsIndexPath,
  mainConfigLoaderPath,
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

// Fast shims for simple operations using proper logging/formatting
if (argvRaw.includes('--version') || argvRaw.includes('-v')) {
  const { version } = require(packageJsonPath);
  logger.info(version);
  process.exit(0);
}

function createBaseYargs() {
  const yargs = require('yargs/yargs');
  return yargs(hideBin(process.argv))
    .parserConfiguration({ 'short-option-groups': false })
    .scriptName('oshea')
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
      describe: 'enable detailed debug output with enhanced logging',
      type: 'boolean',
      default: false
    })
    .option('stack', {
      describe: 'show stack traces in debug output (implies --debug)',
      type: 'boolean',
      default: false
    })
    .alias('h', 'help')
    .alias('v', 'version')
    .epilogue(
      'For more information, refer to the README.md file.\n' +
            'Tab-completion Tip:\n' +
            '   echo \'source <(oshea completion)\' >> ~/.bashrc\n' +
            '   echo \'source <(oshea completion)\' >> ~/.zshrc\n' +
            'then run source ~/.bashrc or source ~/.zshrc\n' +
            'oshea _tab_cache'
    );
}

if (argvRaw.includes('--help') || argvRaw.includes('-h')) {
  createBaseYargs()
    .command('completion', 'generate completion script')
    .command('[markdownFile]', 'convert a markdown file to PDF (default command)')
    .command('convert <markdownFile>', 'convert a markdown file to PDF')
    .command('generate <pluginName>', 'generate a document from a complex plugin')
    .command('plugin <command>', 'manage plugins')
    .command('collection <subcommand>', 'manage plugin collections')
    .command('update [<collection_name>]', 'update a git-based plugin collection')
    .command('config', 'display active configuration settings')
    .showHelp((output) => {
      logger.info(output);
      process.exit(0);
    });
}

// Lightweight config display shim using proper formatter
if (argvRaw[0] === 'config' && argvRaw.length <= 3 && !argvRaw.includes('--plugin')) {
  const fs = require('fs');
  const yaml = require('js-yaml');
  const path = require('path');
  const { formatGlobalConfig } = require(configFormatterPath);

  try {
    const configPath = path.join(__dirname, 'config.example.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);

    const sources = {
      mainConfigPath: configPath,
      loadReason: 'factory default fallback',
      useFactoryDefaultsOnly: false,
      factoryDefaultMainConfigPath: configPath
    };

    formatGlobalConfig('info', '', {
      configData: config,
      sources,
      isPure: argvRaw.includes('--pure')
    });
    process.exit(0);
  } catch {
    // Fall through to full engine for complex config operations
  }
}

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


const { execSync } = require('child_process');

const ConfigResolver = require(configResolverPath);
const CollectionsManager = require(collectionsIndexPath);
const MainConfigLoader = require(mainConfigLoaderPath);

const {
  commonCommandHandler,
  executeConversion,
  executeGeneration
} = require('./index.js'); // lint-skip-line no-relative-paths

const configCommand = require(configCommandPath);
const pluginCommand = require(pluginCommandPath);
const convertCommandModule = require(convertCommandPath);
const generateCommand = require(generateCommandPath);
const collectionCommand = require(collectionCommandPath);
const updateCommand = require(updateCommandPath);


async function main() {
  let managerInstance;

  const argvBuilder = createBaseYargs();

  argvBuilder.middleware(async (argv) => {
    // Configure enhanced debugging if --debug or --stack flag is used
    if (argv.debug || argv.stack) {
      logger.setDebugMode(true);

      const debugConfig = {
        showCaller: true,
        enrichErrors: true,
        showStack: argv.stack || false
      };

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
    });

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

// CLI module - main functions now in index.js
module.exports = {};
