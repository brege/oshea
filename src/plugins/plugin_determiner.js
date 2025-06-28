// src/plugins/plugin_determiner.js
// Dependencies for this module are now injected via the function arguments.
// No direct 'require' statements for fs, path, yaml, markdownUtils here.

const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

/**
 * Determines the plugin to use based on CLI arguments, front matter, local config, or default.
 *
 * @param {object} args - Command line arguments, potentially containing `plugin` and `markdownFile`.
 * @param {object} dependencies - Injected dependencies.
 * @param {object} dependencies.fsPromises - Node's `fs.promises` module.
 * @param {object} dependencies.fsSync - Node's synchronous `fs` module (e.g., `fs.existsSync`, `fs.statSync`).
 * @param {object} dependencies.path - Node's `path` module.
 * @param {object} dependencies.yaml - The `js-yaml` library.
 * @param {object} dependencies.markdownUtils - The local `markdown_utils` module.
 * @param {function} dependencies.processCwd - A function that returns the current working directory (e.g., `process.cwd`).
 * @param {string} defaultPluginName - The name of the default plugin to use if no other is determined.
 * @returns {Promise<object>} An object containing `pluginSpec`, `source`, and `localConfigOverrides`.
 */
async function determinePluginToUse(args, { fsPromises, fsSync, path, yaml, markdownUtils, processCwd }, defaultPluginName = 'default') {
    let pluginSpec = defaultPluginName;
    let determinationSource = 'default';
    let localConfigOverrides = null;

    const cliPluginArg = args.plugin; // CORRECTED: This line is now definitively present.

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
                console.warn(`WARN (plugin_determiner): Could not read or parse front matter from ${args.markdownFile}: ${error.message}`);
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
                        const { plugin, ...overrides } = parsedLocalConfig;
                        if (Object.keys(overrides).length > 0) {
                            localConfigOverrides = overrides;
                        }
                    }
                } catch (error) {
                    console.warn(`WARN (plugin_determiner): Could not read or parse local config file ${localConfigPath}: ${error.message}`);
                }
            }
        } else {
            console.warn(`WARN (plugin_determiner): Markdown file not found at ${markdownFilePathAbsolute}. Cannot check front matter or local config.`);
        }
    }

    // Precedence: CLI > Front Matter > Local Config File > Default
    if (cliPluginArg) {
        pluginSpec = cliPluginArg;
        determinationSource = 'CLI option';
        if (fmPlugin && cliPluginArg !== fmPlugin) {
            console.log(`INFO: Plugin '${cliPluginArg}' specified via CLI, overriding front matter plugin '${fmPlugin}'.`);
        } else if (!fmPlugin && localCfgPlugin && cliPluginArg !== localCfgPlugin) {
            console.log(`INFO: Plugin '${cliPluginArg}' specified via CLI, overriding local config plugin '${localCfgPlugin}'.`);
        }
    } else if (fmPlugin) {
        pluginSpec = fmPlugin;
        determinationSource = `front matter in '${path.basename(args.markdownFile)}'`;
        if (localCfgPlugin && fmPlugin !== localCfgPlugin) {
            console.log(`INFO: Plugin '${fmPlugin}' from front matter, overriding local config plugin '${localCfgPlugin}'.`);
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
            if (process.env.DEBUG) console.log(`DEBUG (plugin_determiner): Self-activating from plugin directory: ${potentialPluginConfigPath}`);
        } else if (fsSync.existsSync(potentialPluginConfigPathDirect) && fsSync.statSync(potentialPluginConfigPathDirect).isFile()) {
            pluginSpec = potentialPluginConfigPathDirect;
            determinationSource += ' (self-activated via direct path)';
            if (process.env.DEBUG) console.log(`DEBUG (plugin_determiner): Self-activating from direct path: ${potentialPluginConfigPathDirect}`);
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
    let logMessage = `INFO: Using plugin '${pluginSpec}' (determined via ${determinationSource})`;

    // Only log the final determination if it's not a redundant message following an override log.
    if (!args.isLazyLoad || determinationSource !== 'default' || (cliPluginArg && fmPlugin && cliPluginArg !== fmPlugin)) {
        if (logMessage !== console.lastLog) {
             console.log(logMessage);
        }
    }
    console.lastLog = logMessage;

    return { pluginSpec, source: determinationSource, localConfigOverrides };
}

// Temp hack to avoid duplicate logs, ideally manage state better or make logs more distinct
// This remains outside the function as it's a global console state
console.lastLog = "";

module.exports = { determinePluginToUse };
