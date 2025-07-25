// src/core/watch-handler.js
const { configResolverPath, loggerPath } = require('@paths');
const logger = require(loggerPath);
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const ConfigResolver = require(configResolverPath);

async function setupWatch(args, configResolverForInitialPaths, commandExecutor) {
  let isProcessing = false;
  let needsRebuild = false;
  let watcher = null;
  let watchedPaths = [];

  const collectWatchablePaths = async (currentConfigResolver, currentArgs) => {
    const files = new Set();
    const configResolver = currentConfigResolver;

    try {
      const effectiveConfig = await configResolver.getEffectiveConfig(currentArgs.plugin || currentArgs.pluginName);
      const pluginSpecificConfig = effectiveConfig.pluginSpecificConfig;
      const pluginBasePath = effectiveConfig.pluginBasePath;

      if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
        files.add(path.resolve(currentArgs.markdownFile));
      }

      // Add plugin-declared watch_sources
      if (pluginSpecificConfig && Array.isArray(pluginSpecificConfig.watch_sources)) {
        for (const sourceEntry of pluginSpecificConfig.watch_sources) {
          if (!sourceEntry || typeof sourceEntry !== 'object') {
            logger.warn(`Invalid entry in watch_sources for plugin '${currentArgs.plugin || currentArgs.pluginName}'. Skipping.`, { module: 'src/core/watch_handler.js' });
            continue;
          }

          let resolvedPathToAdd = null;

          if (sourceEntry.path_from_cli_arg && typeof sourceEntry.path_from_cli_arg === 'string') {
            const cliValue = currentArgs[sourceEntry.path_from_cli_arg];
            if (cliValue && typeof cliValue === 'string') {
              resolvedPathToAdd = path.resolve(cliValue);
            } else {
              logger.warn(`CLI argument '${sourceEntry.path_from_cli_arg}' not found or invalid for watch_sources in plugin '${currentArgs.plugin || currentArgs.pluginName}'.`, { module: 'src/core/watch_handler.js' });
            }
          } else if (sourceEntry.path && typeof sourceEntry.path === 'string') {
            // Placeholder substitution for paths like "{{ cliArgs.someDir }}/data.json"
            let pathValue = sourceEntry.path;
            const placeholderRegex = /\{\{\s*cliArgs\.([\w-]+)\s*\}\}/g;
            let match;
            while ((match = placeholderRegex.exec(pathValue)) !== null) {
              const argName = match[1];
              if (currentArgs[argName] !== undefined) {
                pathValue = pathValue.replace(match[0], currentArgs[argName]);
              } else {
                logger.warn(`CLI argument '${argName}' in placeholder not found for watch_sources path '${sourceEntry.path}' in plugin '${currentArgs.plugin || currentArgs.pluginName}'.`, { module: 'src/core/watch_handler.js' });
              }
            }
            resolvedPathToAdd = path.resolve(pluginBasePath, pathValue);
          } else if (sourceEntry.type === 'glob' && sourceEntry.pattern && typeof sourceEntry.pattern === 'string') {
            let globPattern = sourceEntry.pattern;
            let globBase = pluginBasePath; // Default base path

            if (sourceEntry.base_path_from_cli_arg && currentArgs[sourceEntry.base_path_from_cli_arg]) {
              globBase = path.resolve(currentArgs[sourceEntry.base_path_from_cli_arg]);
            }

            // Placeholder substitution for glob patterns and base paths
            const placeholderRegex = /\{\{\s*cliArgs\.([\w-]+)\s*\}\}/g;
            let match;
            while ((match = placeholderRegex.exec(globPattern)) !== null) {
              const argName = match[1];
              if (currentArgs[argName] !== undefined) {
                globPattern = globPattern.replace(match[0], currentArgs[argName]);
              } else {
                logger.warn(`CLI argument '${argName}' in placeholder not found for watch_sources glob pattern '${sourceEntry.pattern}' in plugin '${currentArgs.plugin || currentArgs.pluginName}'.`, { module: 'src/core/watch_handler.js' });
              }
            }
            // Note: globBase itself could also contain placeholders if we decide to support that,
            // but the proposal focuses placeholders within 'path' or 'pattern'.

            if (path.isAbsolute(globPattern)) {
              resolvedPathToAdd = globPattern;
            } else {
              resolvedPathToAdd = path.join(globBase, globPattern);
            }
          }


          if (resolvedPathToAdd) {
            if (sourceEntry.type !== 'glob' && !fs.existsSync(resolvedPathToAdd)) {
              logger.warn(`Declared watch path does not exist: ${resolvedPathToAdd} (from plugin '${currentArgs.plugin || currentArgs.pluginName}')`, { module: 'src/core/watch_handler.js' });
            } else {
              files.add(resolvedPathToAdd);
              logger.info(`Added to watch list from plugin '${currentArgs.plugin || currentArgs.pluginName}': ${resolvedPathToAdd}`, { module: 'src/core/watch_handler.js' });
            }
          } else if (sourceEntry.type !== 'glob') {
            logger.warn(`Could not resolve path for a watch_sources entry in plugin '${currentArgs.plugin || currentArgs.pluginName}': ${JSON.stringify(sourceEntry)}`, { module: 'src/core/watch_handler.js' });
          }
        }
      }

      const configSources = configResolver.getConfigFileSources();

      if (configSources.mainConfigPath && fs.existsSync(configSources.mainConfigPath)) {
        files.add(configSources.mainConfigPath);
      }
      configSources.pluginConfigPaths.forEach(p => {
        if (p && fs.existsSync(p)) files.add(p);
      });
      configSources.cssFiles.forEach(cssPath => {
        if (fs.existsSync(cssPath)) files.add(cssPath);
      });

      if (effectiveConfig.handlerScriptPath && fs.existsSync(effectiveConfig.handlerScriptPath)) {
        files.add(effectiveConfig.handlerScriptPath);
      }

    } catch (error) {
      logger.warn(`Could not determine all paths to watch for plugin '${currentArgs.plugin || currentArgs.pluginName}': ${error.message}`, { module: 'src/core/watch_handler.js' });
      if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
        files.add(path.resolve(currentArgs.markdownFile));
      }
      if (currentArgs.config && fs.existsSync(currentArgs.config)) {
        files.add(path.resolve(currentArgs.config));
      }
    }

    if (configResolver.defaultMainConfigPath && fs.existsSync(configResolver.defaultMainConfigPath)) {
      files.add(configResolver.defaultMainConfigPath);
    }
    if (configResolver.xdgGlobalConfigPath && fs.existsSync(configResolver.xdgGlobalConfigPath)) {
      files.add(configResolver.xdgGlobalConfigPath);
    }

    return Array.from(files).filter(p => p);
  };

  const rebuild = async (event, filePathTrigger) => {
    if (isProcessing) {
      needsRebuild = true;
      return;
    }
    isProcessing = true;
    needsRebuild = false;
    logger.info(`\nDetected ${event} in: ${filePathTrigger}. Rebuilding...`, { module: 'src/core/watch_handler.js' });

    try {
      await commandExecutor(args);

      const newConfigResolverForPaths = new ConfigResolver(args.config, args.factoryDefaults);
      const newWatchedPaths = await collectWatchablePaths(newConfigResolverForPaths, args);

      const pathsToAdd = newWatchedPaths.filter(p => !watchedPaths.includes(p));
      const pathsToRemove = watchedPaths.filter(p => !newWatchedPaths.includes(p));

      if (watcher) {
        if (pathsToRemove.length > 0) {
          watcher.unwatch(pathsToRemove);
        }
        if (pathsToAdd.length > 0) {
          watcher.add(pathsToAdd);
        }
      }
      watchedPaths = newWatchedPaths;

      if (event === 'unlink' && watchedPaths.includes(filePathTrigger)) {
        if (fs.existsSync(filePathTrigger)) {
          if (watcher) watcher.add(filePathTrigger);
        }
      }
    } catch (error) {
      logger.error('Rebuild failed triggered by', {
        module: 'src/core/watch_handler.js',
        filePathTrigger: filePathTrigger,
        event: event,
        error: error.message
      });
      if (error.stack) logger.error(error.stack, { module: 'src/core/watch_handler.js' });
    } finally {
      isProcessing = false;
      if (needsRebuild) {
        logger.info('Executing queued rebuild...', { module: 'src/core/watch_handler.js' });
        setTimeout(() => {
          if (!isProcessing) {
            rebuild('queued', 'queued changes');
          } else {
            needsRebuild = true;
          }
        }, 250);
      } else {
        logger.info('Watching for further changes...', { module: 'src/core/watch_handler.js' });
      }
    }
  };

  try {
    const initialConfigResolver = new ConfigResolver(args.config, args.factoryDefaults);
    watchedPaths = await collectWatchablePaths(initialConfigResolver, args);
  } catch (e) {
    logger.error('Failed to collect initial paths for watcher', {
        module: 'src/core/watch_handler.js',
        error: e.message
      });
    watchedPaths = [];
    if (args.markdownFile && fs.existsSync(args.markdownFile)) {
      watchedPaths.push(path.resolve(args.markdownFile));
    }
  }

  if (watchedPaths.length === 0) {
    logger.warn('Watch mode activated, but no files could be identified to watch. Executing command once.', { module: 'src/core/watch_handler.js' });
    try {
      await commandExecutor(args);
    } catch(e) {
      logger.error('Single execution failed in watch mode (no files watched):', {
        module: 'src/core/watch_handler.js',
        error: e.message
      });
    }
    return;
  }

  logger.info('\nWatch mode active. Initially monitoring:', { module: 'src/core/watch_handler.js' });
  watchedPaths.forEach(f => logger.detail(`  - ${f}`, { module: 'src/core/watch_handler.js' }));
  logger.info('Press Ctrl+C to exit.', { module: 'src/core/watch_handler.js' });

  watcher = chokidar.watch(watchedPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher
    .on('all', (event, filePath) => {
      if (['add', 'change', 'unlink'].includes(event)) {
        rebuild(event, filePath);
      }
    })
    .on('error', error =>
      logger.error('Watcher error:', {
        module: 'src/core/watch_handler.js',
        error: error.message
      }));
  try {
    logger.info('Performing initial build for watch mode...', { module: 'src/core/watch_handler.js' });
    await commandExecutor(args);
  } catch (e) {
    logger.error('Initial build failed in watch mode:', {
      module: 'src/core/watch_handler.js',
      error: e.message
    });
  }
}

module.exports = { setupWatch };
