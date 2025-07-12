// src/plugins/plugin_determiner.js

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

  if (args.markdownFile) {
    markdownFilePathAbsolute = path.resolve(args.markdownFile);
    if (fsSync.existsSync(markdownFilePathAbsolute)) {
      try {
        const rawMarkdownContent = await fsPromises.readFile(markdownFilePathAbsolute, 'utf8');
        const { data: frontMatter } = markdownUtils.extractFrontMatter(rawMarkdownContent);
        if (frontMatter && frontMatter.md_to_pdf_plugin) {
          fmPlugin = frontMatter.md_to_pdf_plugin;
        }
      } catch (error) {
        logger.warn(`Could not read or parse front matter from ${args.markdownFile}: ${error.message}`, { module: 'plugin_determiner' });
      }

      const localConfigPath = path.resolve(path.dirname(markdownFilePathAbsolute), `${path.basename(markdownFilePathAbsolute, path.extname(markdownFilePathAbsolute))}${PLUGIN_CONFIG_FILENAME_SUFFIX}`);
      localConfigFileNameForLogging = path.basename(localConfigPath);
      if (fsSync.existsSync(localConfigPath)) {
        try {
          const localConfigContent = await fsPromises.readFile(localConfigPath, 'utf8');
          const parsedLocalConfig = yaml.load(localConfigContent);
          if (parsedLocalConfig && parsedLocalConfig.plugin) {
            localCfgPlugin = parsedLocalConfig.plugin;
          }
          if (parsedLocalConfig) {
            const overrides = { ...parsedLocalConfig };
            delete overrides.plugin;
            if (Object.keys(overrides).length > 0) {
              localConfigOverrides = overrides;
            }
          }
        } catch (error) {
          logger.warn(`Could not read or parse local config file ${localConfigPath}: ${error.message}`, { module: 'plugin_determiner' });
        }
      }
    } else {
      logger.warn(`Markdown file not found at ${markdownFilePathAbsolute}. Cannot check front matter or local config.`, { module: 'plugin_determiner' });
    }
  }

  // Precedence: CLI > Front Matter > Local Config File > Default
  if (cliPluginArg) {
    pluginSpec = cliPluginArg;
    determinationSource = 'CLI option';
    if (fmPlugin && cliPluginArg !== fmPlugin) {
      logger.info(`Plugin '${cliPluginArg}' specified via CLI, overriding front matter plugin '${fmPlugin}'.`, { module: 'plugin_determiner' });
    } else if (!fmPlugin && localCfgPlugin && cliPluginArg !== localCfgPlugin) {
      logger.info(`Plugin '${cliPluginArg}' specified via CLI, overriding local config plugin '${localCfgPlugin}'.`, { module: 'plugin_determiner' });
    }
  } else if (fmPlugin) {
    pluginSpec = fmPlugin;
    determinationSource = `front matter in '${path.basename(args.markdownFile)}'`;
    if (localCfgPlugin && fmPlugin !== localCfgPlugin) {
      logger.info(`Plugin '${fmPlugin}' from front matter, overriding local config plugin '${localCfgPlugin}'.`, { module: 'plugin_determiner' });
    }
  } else if (localCfgPlugin) {
    pluginSpec = localCfgPlugin;
    determinationSource = `local '${localConfigFileNameForLogging}'`;
  }
  // If still defaultPluginName, determinationSource remains 'default'

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

    if (fsSync.existsSync(potentialPluginConfigPath) && fsSync.statSync(potentialPluginConfigPath).isFile()) {
      pluginSpec = potentialPluginConfigPath;
      determinationSource += ' (self-activated via dir path)';
    } else if (fsSync.existsSync(potentialPluginConfigPathDirect) && fsSync.statSync(potentialPluginConfigPathDirect).isFile()) {
      pluginSpec = potentialPluginConfigPathDirect;
      determinationSource += ' (self-activated via direct path)';
    }
  }

  // Resolve relative path if spec is relative (applies to FM or Local Config sourced paths that are still relative)
  if (typeof pluginSpec === 'string' && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
    if (markdownFilePathAbsolute) {
      pluginSpec = path.resolve(path.dirname(markdownFilePathAbsolute), pluginSpec);
    } else {
      // If markdownFile is not present, this path might be relative to CWD.
      // For consistency with CLI, assume CWD if no markdown file.
      pluginSpec = path.resolve(processCwd(), pluginSpec);
    }
  }

  // This line is not used.
  let logMessage = `Using plugin '${pluginSpec}' (determined via ${determinationSource})`;

  // Only log the final determination if it's not a redundant message following an override log.
  if (!args.isLazyLoad || determinationSource !== 'default' || (cliPluginArg && fmPlugin && cliPluginArg !== fmPlugin)) {
    logger.info(logMessage, { module: 'plugin_determiner' });
  }

  return { pluginSpec, source: determinationSource, localConfigOverrides };
}

module.exports = { determinePluginToUse };
