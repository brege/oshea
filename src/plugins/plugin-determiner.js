// src/plugins/plugin-determiner.js

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';
const { loggerPath } = require('@paths');
const logger = require(loggerPath);


async function determinePluginToUse(args, { fsPromises, fsSync, path, yaml, markdownUtils, processCwd }, defaultPluginName = 'default') {
  let pluginSpec = defaultPluginName;
  let determinationSource = 'default';
  let localConfigOverrides = null;

  const cliPluginArg = args.plugin;

  let fmPlugin = null;
  let localCfgPlugin = null;
  let markdownFilePathAbsolute = null;
  let localConfigFileNameForLogging = null;

  logger.debug('Starting plugin determination process', {
    context: 'PluginDeterminer',
    cliPluginArg: cliPluginArg,
    markdownFile: args.markdownFile || 'N/A'
  });

  if (args.markdownFile) {
    markdownFilePathAbsolute = path.resolve(args.markdownFile);
    logger.debug('Resolved markdown file path', {
      context: 'PluginDeterminer',
      path: markdownFilePathAbsolute
    });

    if (fsSync.existsSync(markdownFilePathAbsolute)) {
      try {
        const rawMarkdownContent = await fsPromises.readFile(markdownFilePathAbsolute, 'utf8');
        const { data: frontMatter } = markdownUtils.extractFrontMatter(rawMarkdownContent);
        if (frontMatter && frontMatter.oshea_plugin) {
          fmPlugin = frontMatter.oshea_plugin;
          logger.debug('Plugin found in front matter', {
            context: 'PluginDeterminer',
            plugin: fmPlugin,
            markdownFile: markdownFilePathAbsolute
          });
        } else {
          logger.debug('No plugin specified in front matter', {
            context: 'PluginDeterminer',
            markdownFile: markdownFilePathAbsolute
          });
        }
      } catch (error) {
        logger.warn('Could not read or parse front matter', {
          context: 'PluginDeterminer',
          file: args.markdownFile,
          error: error.message
        });
      }

      const localConfigPath = path.resolve(path.dirname(markdownFilePathAbsolute), `${path.basename(markdownFilePathAbsolute, path.extname(markdownFilePathAbsolute))}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
      localConfigFileNameForLogging = path.basename(localConfigPath);
      logger.debug('Checking for local config file', {
        context: 'PluginDeterminer',
        path: localConfigPath
      });

      if (fsSync.existsSync(localConfigPath)) {
        try {
          const localConfigContent = await fsPromises.readFile(localConfigPath, 'utf8');
          const parsedLocalConfig = yaml.load(localConfigContent);
          if (parsedLocalConfig && parsedLocalConfig.plugin) {
            localCfgPlugin = parsedLocalConfig.plugin;
            logger.debug('Plugin found in local config file', {
              context: 'PluginDeterminer',
              plugin: localCfgPlugin,
              localConfigFile: localConfigFileNameForLogging
            });
          }
          if (parsedLocalConfig) {
            const overrides = { ...parsedLocalConfig };
            delete overrides.plugin;
            if (Object.keys(overrides).length > 0) {
              localConfigOverrides = overrides;
              logger.debug('Local config file contains overrides', {
                context: 'PluginDeterminer',
                localConfigFile: localConfigFileNameForLogging,
                overrideKeys: Object.keys(overrides)
              });
            }
          }
        } catch (error) {
          logger.warn('Could not read or parse local config file', {
            context: 'PluginDeterminer',
            file: localConfigPath,
            error: error.message
          });
        }
      } else {
        logger.debug('Local config file not found', {
          context: 'PluginDeterminer',
          path: localConfigPath
        });
      }
    } else {
      logger.warn('Markdown file not found', {
        context: 'PluginDeterminer',
        file: markdownFilePathAbsolute,
        suggestion: 'Cannot check front matter or local config.'
      });
    }
  }

  // Precedence: CLI > Front Matter > Local Config File > Default
  if (cliPluginArg) {
    pluginSpec = cliPluginArg;
    determinationSource = 'CLI option';
    if (fmPlugin && cliPluginArg !== fmPlugin) {
      logger.info('Plugin specified via CLI, overriding front matter plugin', {
        context: 'PluginDeterminer',
        cliPlugin: cliPluginArg,
        frontMatterPlugin: fmPlugin
      });
    } else if (!fmPlugin && localCfgPlugin && cliPluginArg !== localCfgPlugin) {
      logger.info('Plugin specified via CLI, overriding local config plugin', {
        context: 'PluginDeterminer',
        cliPlugin: cliPluginArg,
        localConfigPlugin: localCfgPlugin
      });
    }
  } else if (fmPlugin) {
    pluginSpec = fmPlugin;
    determinationSource = `front matter in '${path.basename(args.markdownFile)}'`;
    if (localCfgPlugin && fmPlugin !== localCfgPlugin) {
      logger.info('Plugin from front matter, overriding local config plugin', {
        context: 'PluginDeterminer',
        frontMatterPlugin: fmPlugin,
        localConfigPlugin: localCfgPlugin
      });
    }
  } else if (localCfgPlugin) {
    pluginSpec = localCfgPlugin;
    determinationSource = `local '${localConfigFileNameForLogging}'`;
  }
  // If still defaultPluginName, determinationSource remains 'default'
  logger.debug('Initial plugin determination', {
    context: 'PluginDeterminer',
    pluginSpec: pluginSpec,
    source: determinationSource
  });


  // If the determined pluginSpec is a name (not already a path) AND it originated from
  // front matter or a local config (meaning it's likely a local plugin for the markdown file),
  // try to resolve it to a full path for "lazy-loading".
  const isNameSpec = typeof pluginSpec === 'string' && !(pluginSpec.includes(path.sep) || pluginSpec.startsWith('.'));

  if (isNameSpec && markdownFilePathAbsolute && (determinationSource.startsWith('front matter') || determinationSource.startsWith('local'))) {
    const markdownDir = path.dirname(markdownFilePathAbsolute);
    // First, check for a plugin config within a sub-directory named after the plugin (e.g., /my-plugin/my-plugin.config.yaml)
    const potentialPluginConfigPath = path.join(markdownDir, pluginSpec, `${pluginSpec}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
    // Second, check for a plugin config directly in the markdown file's directory (e.g., /my-plugin.config.yaml)
    const potentialPluginConfigPathDirect = path.join(markdownDir, `${pluginSpec}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);

    logger.debug('Attempting to self-activate plugin based on name spec and markdown file context', {
      context: 'PluginDeterminer',
      pluginName: pluginSpec,
      markdownDir: markdownDir
    });

    if (fsSync.existsSync(potentialPluginConfigPath) && fsSync.statSync(potentialPluginConfigPath).isFile()) {
      pluginSpec = potentialPluginConfigPath;
      determinationSource += ' (self-activated via dir path)';
      logger.info('Plugin self-activated via directory path', {
        context: 'PluginDeterminer',
        pluginSpec: pluginSpec,
        source: determinationSource
      });
    } else if (fsSync.existsSync(potentialPluginConfigPathDirect) && fsSync.statSync(potentialPluginConfigPathDirect).isFile()) {
      pluginSpec = potentialPluginConfigPathDirect;
      determinationSource += ' (self-activated via direct path)';
      logger.info('Plugin self-activated via direct path', {
        context: 'PluginDeterminer',
        pluginSpec: pluginSpec,
        source: determinationSource
      });
    }
  }

  // Resolve relative path if spec is relative (applies to FM or Local Config sourced paths that are still relative)
  if (typeof pluginSpec === 'string' && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
    if (markdownFilePathAbsolute) {
      const originalPluginSpec = pluginSpec;
      pluginSpec = path.resolve(path.dirname(markdownFilePathAbsolute), pluginSpec);
      logger.debug('Resolved relative plugin path based on markdown file', {
        context: 'PluginDeterminer',
        originalPluginSpec: originalPluginSpec,
        resolvedPath: pluginSpec,
        baseDir: path.dirname(markdownFilePathAbsolute)
      });
    } else {
      // If markdownFile is not present, this path might be relative to CWD.
      // For consistency with CLI, assume CWD if no markdown file.
      const originalPluginSpec = pluginSpec;
      pluginSpec = path.resolve(processCwd(), pluginSpec);
      logger.debug('Resolved relative plugin path based on current working directory', {
        context: 'PluginDeterminer',
        originalPluginSpec: originalPluginSpec,
        resolvedPath: pluginSpec,
        baseDir: processCwd()
      });
    }
    determinationSource += ' (resolved relative path)';
  }

  logger.debug('Final plugin determination', {
    context: 'PluginDeterminer',
    pluginSpec: pluginSpec,
    source: determinationSource
  });

  return { pluginSpec, source: determinationSource, localConfigOverrides };
}

module.exports = { determinePluginToUse };
