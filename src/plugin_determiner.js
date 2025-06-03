// dev/src/plugin_determiner.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous existsSync
const path = require('path');
const yaml = require('js-yaml');
const markdownUtils = require('./markdown_utils');

// Add this constant at the top
const PLUGIN_CONFIG_FILENAME_SUFFIX = '.config.yaml';

async function determinePluginToUse(args, defaultPluginName = 'default') {
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
        if (fss.existsSync(markdownFilePathAbsolute)) {
            try {
                const rawMarkdownContent = await fs.readFile(markdownFilePathAbsolute, 'utf8');
                const { data: frontMatter } = markdownUtils.extractFrontMatter(rawMarkdownContent);
                if (frontMatter && frontMatter.md_to_pdf_plugin) {
                    fmPlugin = frontMatter.md_to_pdf_plugin;
                }
            } catch (error) {
                console.warn(`WARN (plugin_determiner): Could not read or parse front matter from ${args.markdownFile}: ${error.message}`);
            }

            const localConfigPath = path.resolve(path.dirname(markdownFilePathAbsolute), `${path.basename(markdownFilePathAbsolute, path.extname(markdownFilePathAbsolute))}.config.yaml`);
            localConfigFileNameForLogging = path.basename(localConfigPath);
            if (fss.existsSync(localConfigPath)) {
                try {
                    const localConfigContent = await fs.readFile(localConfigPath, 'utf8');
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

    // --- NEW LOGIC FOR SELF-ACTIVATION ---
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

        if (fss.existsSync(potentialPluginConfigPath) && fss.statSync(potentialPluginConfigPath).isFile()) {
            pluginSpec = potentialPluginConfigPath;
            determinationSource += ' (self-activated via dir path)';
            if (process.env.DEBUG) console.log(`DEBUG (plugin_determiner): Self-activating from plugin directory: ${potentialPluginConfigPath}`);
        } else if (fss.existsSync(potentialPluginConfigPathDirect) && fss.statSync(potentialPluginConfigPathDirect).isFile()) {
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
            pluginSpec = path.resolve(process.cwd(), pluginSpec);
        }
    }
    // --- END NEW LOGIC ---

    const baseMdFilename = args.markdownFile ? path.basename(args.markdownFile) : 'N/A';
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
console.lastLog = "";

module.exports = { determinePluginToUse };
