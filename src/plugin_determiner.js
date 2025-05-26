// src/plugin_determiner.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous existsSync
const path = require('path');
const yaml = require('js-yaml');
const markdownUtils = require('./markdown_utils');

async function determinePluginToUse(args, defaultPluginName = 'default') {
    let pluginSpec = defaultPluginName;
    let determinationSource = 'default';
    let localConfigOverrides = null;

    const cliPluginArg = args.plugin; // Explicitly capture CLI argument
    let fmPlugin = null;
    let localCfgPlugin = null;
    let localConfigFileNameForLogging = null; // For concise logging

    if (args.markdownFile) {
        const markdownFilePath = path.resolve(args.markdownFile);
        if (fss.existsSync(markdownFilePath)) {
            try {
                const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
                const { data: frontMatter } = markdownUtils.extractFrontMatter(rawMarkdownContent);
                if (frontMatter && frontMatter.md_to_pdf_plugin) {
                    fmPlugin = frontMatter.md_to_pdf_plugin;
                }
            } catch (error) {
                console.warn(`WARN (plugin_determiner): Could not read or parse front matter from ${args.markdownFile}: ${error.message}`);
            }

            const localConfigPath = path.resolve(path.dirname(markdownFilePath), `${path.basename(markdownFilePath, path.extname(markdownFilePath))}.config.yaml`);
            localConfigFileNameForLogging = path.basename(localConfigPath);
            if (fss.existsSync(localConfigPath)) {
                try {
                    const localConfigContent = await fs.readFile(localConfigPath, 'utf8');
                    const parsedLocalConfig = yaml.load(localConfigContent);
                    if (parsedLocalConfig && parsedLocalConfig.plugin) {
                        localCfgPlugin = parsedLocalConfig.plugin;
                    }
                    if (parsedLocalConfig) {
                        const { plugin, ...overrides } = parsedLocalConfig; // Correctly destructure
                        if (Object.keys(overrides).length > 0) {
                            localConfigOverrides = overrides;
                        }
                    }
                } catch (error) {
                    console.warn(`WARN (plugin_determiner): Could not read or parse local config file ${localConfigPath}: ${error.message}`);
                }
            }
        } else {
            console.warn(`WARN (plugin_determiner): Markdown file not found at ${markdownFilePath}. Cannot check front matter or local config.`);
        }
    }

    // Determine plugin based on precedence and log overrides
    if (cliPluginArg) {
        pluginSpec = cliPluginArg;
        determinationSource = 'CLI option';
        if (fmPlugin && cliPluginArg !== fmPlugin) {
            console.log(`INFO: Plugin '${cliPluginArg}' specified via CLI, overriding front matter plugin '${fmPlugin}'.`);
        } else if (!fmPlugin && localCfgPlugin && cliPluginArg !== localCfgPlugin) {
            // Log override of local config only if FM didn't specify anything
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

    // Resolve path if spec is relative (applies to FM or Local Config sourced paths)
    if (typeof pluginSpec === 'string' && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
        if (determinationSource.startsWith('front matter')) {
            pluginSpec = path.resolve(path.dirname(path.resolve(args.markdownFile)), pluginSpec);
        } else if (determinationSource.startsWith('local')) {
             // Resolve relative to the directory of the markdown file (which is also the dir of the local config)
            pluginSpec = path.resolve(path.dirname(path.resolve(args.markdownFile)), pluginSpec);
        }
    }

    const baseMdFilename = args.markdownFile ? path.basename(args.markdownFile) : 'N/A';
    let logMessage = `INFO: Using plugin '${pluginSpec}' (determined via ${determinationSource})`;
    if (determinationSource.startsWith('front matter') || determinationSource.startsWith('local')) {
        // Log message already includes filename context
    } else if (determinationSource === 'CLI option') {
        if (args.markdownFile) logMessage += ` for '${baseMdFilename}'`;
    } else if (determinationSource === 'default') {
        if (args.markdownFile) logMessage += ` for '${baseMdFilename}'`;
    }

    if (!args.isLazyLoad || pluginSpec !== defaultPluginName || determinationSource !== 'default' || (cliPluginArg && fmPlugin && cliPluginArg !== fmPlugin) /* Ensure override log is shown even in lazy load */ ) {
        // The "Using plugin..." log might be redundant if an override was already logged for CLI.
        // However, the test expects the override message AND this "Using plugin..." message.
        // The previous logic for logging was a bit complex, trying to simplify here.
        // The override messages are logged above. This is the final determination.
        if (logMessage !== console.lastLog) { // Avoid duplicate "Using plugin..." if override was just logged
             console.log(logMessage);
        }
    }
    console.lastLog = logMessage; // Store last log to help avoid duplicates in some cases

    return { pluginSpec, source: determinationSource, localConfigOverrides };
}

// Temp hack to avoid duplicate logs, ideally manage state better or make logs more distinct
console.lastLog = "";

module.exports = { determinePluginToUse };
