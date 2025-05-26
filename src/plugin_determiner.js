// src/plugin_determiner.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous existsSync
const path = require('path');
const markdownUtils = require('./markdown_utils'); 

/**
 * Determines the plugin to use based on CLI arguments and Markdown front matter.
 *
 * @param {object} args - The command-line arguments object.
 * Expected to have `args.plugin` (from CLI) and `args.markdownFile`.
 * @param {string} defaultPluginName - The default plugin name to use if no other is specified.
 * @returns {Promise<{pluginSpec: string, source: string}>}
 * - pluginSpec: The name or resolved absolute path of the plugin to use.
 * - source: A string indicating how the plugin was determined (e.g., "CLI", "front matter", "default").
 */
async function determinePluginToUse(args, defaultPluginName = 'default') {
    let pluginSpec = args.plugin || defaultPluginName;
    let determinationSource = args.plugin ? 'CLI option' : 'default';

    if (args.markdownFile) {
        try {
            const markdownFilePath = path.resolve(args.markdownFile);
            if (fss.existsSync(markdownFilePath)) { 
                const rawMarkdownContent = await fs.readFile(markdownFilePath, 'utf8');
                const { data: frontMatter } = markdownUtils.extractFrontMatter(rawMarkdownContent);

                if (frontMatter && frontMatter.md_to_pdf_plugin) {
                    const fmPluginSpec = frontMatter.md_to_pdf_plugin;
                    if (args.plugin && args.plugin !== defaultPluginName) {
                        // CLI option (other than the default 'default') overrides front matter
                        console.log(`INFO: Plugin '${args.plugin}' specified via CLI, overriding front matter plugin '${fmPluginSpec}'.`);
                        // pluginSpec is already args.plugin
                        determinationSource = 'CLI option';
                    } else {
                        pluginSpec = fmPluginSpec;
                        determinationSource = `front matter in '${path.basename(markdownFilePath)}'`;
                        // If pluginSpec from front matter is a relative path, resolve it
                        if (typeof pluginSpec === 'string' && (pluginSpec.startsWith('./') || pluginSpec.startsWith('../'))) {
                            pluginSpec = path.resolve(path.dirname(markdownFilePath), pluginSpec);
                            console.log(`INFO: Resolved front matter plugin path to: ${pluginSpec}`);
                        }
                    }
                }
            } else {
                console.warn(`WARN (plugin_determiner): Markdown file not found at ${markdownFilePath}. Cannot check front matter.`);
            }
        } catch (error) {
            console.warn(`WARN (plugin_determiner): Could not read or parse front matter from ${args.markdownFile}: ${error.message}`);
            // Proceed with CLI or default plugin
        }
    }

    // If after all checks, pluginSpec is still the initial default and wasn't from CLI, mark source as "default"
    if (pluginSpec === defaultPluginName && determinationSource !== 'CLI option' && (!args.markdownFile || determinationSource !== `front matter in '${path.basename(args.markdownFile)}'`)) {
        determinationSource = 'default';
    }
    
    console.log(`INFO: Using plugin '${pluginSpec}' (determined via ${determinationSource}).`);
    return { pluginSpec, source: determinationSource };
}

module.exports = { determinePluginToUse };
