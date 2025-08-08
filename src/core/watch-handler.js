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
      // Resolve relative plugin paths to absolute paths
      let pluginSpec = currentArgs.plugin || currentArgs.pluginName;
      if (pluginSpec && pluginSpec.startsWith('./')) {
        pluginSpec = path.resolve(pluginSpec);
      }

      const effectiveConfig = await configResolver.getEffectiveConfig(pluginSpec);
      const pluginSpecificConfig = effectiveConfig.pluginSpecificConfig;
      const pluginBasePath = effectiveConfig.pluginBasePath;

      if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
        files.add(path.resolve(currentArgs.markdownFile));
        logger.debug('Added markdown file to watch list', {
          context: 'WatchHandler',
          file: path.resolve(currentArgs.markdownFile)
        });
      }

      // Add plugin-declared watch_sources
      if (pluginSpecificConfig && Array.isArray(pluginSpecificConfig.watch_sources)) {
        for (const sourceEntry of pluginSpecificConfig.watch_sources) {
          if (!sourceEntry || typeof sourceEntry !== 'object') {
            logger.warn('Invalid entry in watch_sources for plugin', {
              context: 'WatchHandler',
              plugin: currentArgs.plugin || currentArgs.pluginName,
              entry: sourceEntry,
              suggestion: 'Skipping invalid watch source entry.'
            });
            continue;
          }

          let resolvedPathToAdd = null;

          if (sourceEntry.path_from_cli_arg && typeof sourceEntry.path_from_cli_arg === 'string') {
            const cliValue = currentArgs[sourceEntry.path_from_cli_arg];
            if (cliValue && typeof cliValue === 'string') {
              resolvedPathToAdd = path.resolve(cliValue);
            } else {
              logger.warn('CLI argument not found or invalid for watch_sources', {
                context: 'WatchHandler',
                cliArgument: sourceEntry.path_from_cli_arg,
                plugin: currentArgs.plugin || currentArgs.pluginName,
                suggestion: `Verify the CLI argument '${sourceEntry.path_from_cli_arg}' is provided and valid.`
              });
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
                logger.warn('CLI argument in placeholder not found for watch_sources path', {
                  context: 'WatchHandler',
                  cliArgument: argName,
                  sourcePath: sourceEntry.path,
                  plugin: currentArgs.plugin || currentArgs.pluginName,
                  suggestion: `Ensure CLI argument '${argName}' is provided.`
                });
              }
            }
            resolvedPathToAdd = path.resolve(pluginBasePath, pathValue);
          } else if (sourceEntry.type === 'glob' && sourceEntry.pattern && typeof sourceEntry.pattern === 'string') {
            let globPattern = sourceEntry.pattern;
            let globBase = pluginBasePath;

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
                logger.warn('CLI argument in placeholder not found for watch_sources glob pattern', {
                  context: 'WatchHandler',
                  cliArgument: argName,
                  globPattern: sourceEntry.pattern,
                  plugin: currentArgs.plugin || currentArgs.pluginName,
                  suggestion: `Ensure CLI argument '${argName}' is provided.`
                });
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
              logger.warn('Declared watch path does not exist', {
                context: 'WatchHandler',
                resource: resolvedPathToAdd,
                plugin: currentArgs.plugin || currentArgs.pluginName,
                suggestion: 'Verify the path specified in plugin configuration exists.'
              });
            } else {
              files.add(resolvedPathToAdd);
              logger.info('Added to watch list from plugin', {
                context: 'WatchHandler',
                file: resolvedPathToAdd,
                plugin: currentArgs.plugin || currentArgs.pluginName
              });
            }
          } else if (sourceEntry.type !== 'glob') {
            logger.warn('Could not resolve path for a watch_sources entry in plugin', {
              context: 'WatchHandler',
              plugin: currentArgs.plugin || currentArgs.pluginName,
              sourceEntry: JSON.stringify(sourceEntry),
              suggestion: 'Check the format and values of the watch_sources entry.'
            });
          }
        }
      }

      // Add CSS files from the effective config (already resolved and available)
      if (pluginSpecificConfig.css_files && Array.isArray(pluginSpecificConfig.css_files)) {
        pluginSpecificConfig.css_files.forEach(cssPath => {
          if (fs.existsSync(cssPath)) {
            files.add(cssPath);
            logger.debug('Added CSS file to watch list', {
              context: 'WatchHandler',
              file: cssPath
            });
          }
        });
      }

      const configSources = configResolver.getConfigFileSources();

      if (configSources.mainConfigPath && fs.existsSync(configSources.mainConfigPath)) {
        files.add(configSources.mainConfigPath);
        logger.debug('Added main config file to watch list', {
          context: 'WatchHandler',
          file: configSources.mainConfigPath
        });
      }
      configSources.pluginConfigPaths.forEach(p => {
        if (p && fs.existsSync(p)) {
          files.add(p);
          logger.debug('Added plugin config file to watch list', {
            context: 'WatchHandler',
            file: p
          });
        }
      });

      if (effectiveConfig.handlerScriptPath && fs.existsSync(effectiveConfig.handlerScriptPath)) {
        files.add(effectiveConfig.handlerScriptPath);
        logger.debug('Added handler script to watch list', {
          context: 'WatchHandler',
          file: effectiveConfig.handlerScriptPath
        });
      }

    } catch (error) {
      logger.warn('Could not determine all paths to watch for plugin', {
        context: 'WatchHandler',
        plugin: currentArgs.plugin || currentArgs.pluginName,
        error: error.message,
        suggestion: 'Falling back to watch Markdown and config files if they exist.'
      });
      if (currentArgs.markdownFile && fs.existsSync(currentArgs.markdownFile)) {
        files.add(path.resolve(currentArgs.markdownFile));
      }
      if (currentArgs.config && fs.existsSync(currentArgs.config)) {
        files.add(path.resolve(currentArgs.config));
      }
    }

    if (configResolver.defaultMainConfigPath && fs.existsSync(configResolver.defaultMainConfigPath)) {
      files.add(configResolver.defaultMainConfigPath);
      logger.debug('Added default main config path to watch list', {
        context: 'WatchHandler',
        file: configResolver.defaultMainConfigPath
      });
    }
    if (configResolver.xdgGlobalConfigPath && fs.existsSync(configResolver.xdgGlobalConfigPath)) {
      files.add(configResolver.xdgGlobalConfigPath);
      logger.debug('Added XDG global config path to watch list', {
        context: 'WatchHandler',
        file: configResolver.xdgGlobalConfigPath
      });
    }

    return Array.from(files).filter(p => p);
  };

  const rebuild = async (event, filePathTrigger) => {
    if (isProcessing) {
      needsRebuild = true;
      logger.debug('Rebuild already in progress, queuing new rebuild', {
        context: 'WatchHandler',
        triggeredByEvent: event,
        triggeredByFile: filePathTrigger
      });
      return;
    }
    isProcessing = true;
    needsRebuild = false;
    logger.info('Detected change, rebuilding...', {
      context: 'WatchHandler',
      event: event,
      filePath: filePathTrigger
    });

    try {
      await commandExecutor(args);
      logger.success('Rebuild completed successfully', {
        context: 'WatchHandler',
        triggeredByFile: filePathTrigger
      });

      const newConfigResolverForPaths = new ConfigResolver(
        args.config,
        args.factoryDefaults,
        args.isLazyLoad || false,
        args.manager ? { collRoot: args.manager.collRoot, collectionsManager: args.manager } : {}
      );
      const newWatchedPaths = await collectWatchablePaths(newConfigResolverForPaths, args);

      const pathsToAdd = newWatchedPaths.filter(p => !watchedPaths.includes(p));
      const pathsToRemove = watchedPaths.filter(p => !newWatchedPaths.includes(p));

      if (watcher) {
        if (pathsToRemove.length > 0) {
          watcher.unwatch(pathsToRemove);
          logger.debug('Unwatched paths', {
            context: 'WatchHandler',
            paths: pathsToRemove
          });
        }
        if (pathsToAdd.length > 0) {
          watcher.add(pathsToAdd);
          logger.debug('Added new paths to watch', {
            context: 'WatchHandler',
            paths: pathsToAdd
          });
        }
      }
      watchedPaths = newWatchedPaths;
      logger.info('Watcher paths updated', {
        context: 'WatchHandler',
        totalWatchedPaths: watchedPaths.length
      });


      if (event === 'unlink' && watchedPaths.includes(filePathTrigger)) {
        if (fs.existsSync(filePathTrigger)) {
          if (watcher) watcher.add(filePathTrigger);
          logger.debug('Re-added unlinked file back to watch list because it re-appeared', {
            context: 'WatchHandler',
            file: filePathTrigger
          });
        }
      }
    } catch (error) {
      logger.error('Rebuild failed', {
        context: 'WatchHandler',
        filePathTrigger: filePathTrigger,
        event: event,
        error: error.message,
        stack: error.stack
      });
    } finally {
      isProcessing = false;
      if (needsRebuild) {
        logger.info('Executing queued rebuild...', {
          context: 'WatchHandler'
        });
        setTimeout(() => {
          if (!isProcessing) {
            rebuild('queued', 'queued changes');
          } else {
            needsRebuild = true;
          }
        }, 250); // Small delay to avoid rapid re-triggering
      } else {
        logger.info('Watching for further changes...', {
          context: 'WatchHandler'
        });
      }
    }
  };

  try {
    const initialConfigResolver = new ConfigResolver(
      args.config,
      args.factoryDefaults,
      args.isLazyLoad || false,
      args.manager ? { collRoot: args.manager.collRoot, collectionsManager: args.manager } : {}
    );
    watchedPaths = await collectWatchablePaths(initialConfigResolver, args);
    logger.info('Initial paths for watcher collected', {
      context: 'WatchHandler',
      pathsCount: watchedPaths.length
    });
  } catch (e) {
    logger.error('Failed to collect initial paths for watcher', {
      context: 'WatchHandler',
      error: e.message,
      stack: e.stack,
      suggestion: 'Watcher might be limited to markdown and config files.'
    });
    watchedPaths = [];
    if (args.markdownFile && fs.existsSync(args.markdownFile)) {
      watchedPaths.push(path.resolve(args.markdownFile));
      logger.debug('Added markdown file to watch list as fallback', {
        context: 'WatchHandler',
        file: path.resolve(args.markdownFile)
      });
    }
    if (args.config && fs.existsSync(args.config)) {
      watchedPaths.push(path.resolve(args.config));
      logger.debug('Added config file to watch list as fallback', {
        context: 'WatchHandler',
        file: path.resolve(args.config)
      });
    }
  }

  if (watchedPaths.length === 0) {
    logger.warn('Watch mode activated, but no files could be identified to watch', {
      context: 'WatchHandler',
      suggestion: 'Executing command once as no files are being monitored for changes.'
    });
    try {
      await commandExecutor(args);
    } catch (e) {
      logger.error('Single execution failed in watch mode (no files watched)', {
        context: 'WatchHandler',
        error: e.message,
        stack: e.stack
      });
    }
    return;
  }

  logger.info('Watch mode active. Initially monitoring these files and directories:', {
    context: 'WatchHandler',
    fileCount: watchedPaths.length
  });
  watchedPaths.forEach(f => logger.info('  - ' + f, { context: 'WatchHandler', type: 'watched_path' }));
  logger.info('Press Ctrl+C to exit.', { context: 'WatchHandler' });


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
      logger.error('Watcher error', {
        context: 'WatchHandler',
        error: error.message,
        stack: error.stack
      }));
  try {
    logger.info('Performing initial build for watch mode...', {
      context: 'WatchHandler'
    });
    await commandExecutor(args);
    logger.success('Initial build completed for watch mode', {
      context: 'WatchHandler'
    });
  } catch (e) {
    logger.error('Initial build failed in watch mode', {
      context: 'WatchHandler',
      error: e.message,
      stack: e.stack
    });
  }
}

module.exports = { setupWatch };
