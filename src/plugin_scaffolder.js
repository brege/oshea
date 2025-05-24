// src/plugin_scaffolder.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous existsSync
const path = require('path');

/**
 * Validates the plugin name.
 * Allowed: letters, numbers, hyphens. Must start/end with letter/number.
 * @param {string} pluginName - The name of the plugin.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidPluginName(pluginName) {
    if (!pluginName || typeof pluginName !== 'string') {
        return false;
    }
    // Must start and end with an alphanumeric character, can contain hyphens
    const regex = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
    return regex.test(pluginName);
}

/**
 * Generates the content for the <pluginName>.config.yaml file.
 * @param {string} pluginName - The name of the plugin.
 * @returns {string} The YAML content.
 */
function generatePluginConfigYamlContent(pluginName) {
    return `# ${pluginName}/${pluginName}.config.yaml
description: "A new ${pluginName} plugin for [purpose]."
handler_script: "index.js" # Points to the handler within this plugin's directory
css_files:
  - "${pluginName}.css"  # Points to CSS within this plugin's directory
pdf_options:
  # Sensible defaults, e.g., from global config or common settings
  format: "Letter"
  margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" }
# toc_options: { enabled: false }
# inject_fm_title_as_h1: true
# aggressiveHeadingCleanup: false
# watch_sources: # Example to show users how to add more
#   - type: "file"
#     path: "data/my-data.json" # Relative to this config file
math:
  enabled: false # Default math to disabled for new plugins
`;
}

/**
 * Generates the content for the index.js handler file.
 * @param {string} pluginName - The name of the plugin.
 * @returns {string} The JavaScript content.
 */
function generatePluginIndexJsContent(pluginName) {
    // Capitalize first letter and parts after hyphens for class name
    const className = pluginName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    return `// ${pluginName}/index.js
class ${className}Handler {
    constructor(coreUtils) {
        // coreUtils contains { DefaultHandler, markdownUtils, pdfGenerator }
        this.handler = new coreUtils.DefaultHandler();
        // this.markdownUtils = coreUtils.markdownUtils;
        // this.pdfGenerator = coreUtils.pdfGenerator;
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
        // Example: Delegate to DefaultHandler
        // Add custom logic here if needed before or after calling DefaultHandler,
        // or implement entirely custom HTML generation.
        console.log(\`INFO (${className}Handler): Processing for plugin '\${pluginSpecificConfig.description || '${pluginName}'}'\`);
        return this.handler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);
    }
}
module.exports = ${className}Handler;
`;
}

/**
 * Generates the content for the <pluginName>.css file.
 * @param {string} pluginName - The name of the plugin.
 * @returns {string} The CSS content.
 */
function generatePluginCssContent(pluginName) {
    return `/* ${pluginName}/${pluginName}.css */
/* Add your custom styles for the '${pluginName}' here. */
body {
    font-family: sans-serif;
}
`;
}

/**
 * Generates the content for the README.md file.
 * @param {string} pluginName - The name of the plugin.
 * @returns {string} The Markdown content.
 */
function generatePluginReadmeMdContent(pluginName) {
    return `---
cli_help: |
  Plugin: ${pluginName}
  Description: [Provide a concise description of what your plugin does.]

  Features:
    - [Feature 1]
    - [Feature 2]

  Expected Front Matter:
    - field_name: (type) Description of expected front matter field.
    - another_field: (type, optional) Another field.

  Configuration Notes (${pluginName}.config.yaml):
    - css_files: Point to your custom CSS.
    - pdf_options: Adjust page size, margins, etc.

  Example Usage:
    md-to-pdf convert document.md --plugin ${pluginName}
---

# ${pluginName} Plugin

This is the README for the \`${pluginName}\` plugin.

## Overview

[Detailed description of your plugin, its purpose, and how it works.]

## Usage

[Explain how to use the plugin, any specific Markdown structure it expects, etc.]

## Configuration

[Detail any important configuration options from \`${pluginName}.config.yaml\` that users might want to customize.]
`;
}


/**
 * Main function to scaffold a new plugin.
 * @param {string} pluginName - The name of the plugin to create.
 * @param {string} [baseDirOpt] - The directory where the plugin folder should be created. Defaults to CWD.
 * @param {boolean} [force=false] - Whether to overwrite if the plugin directory already exists.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function scaffoldPlugin(pluginName, baseDirOpt, force = false) {
    if (!isValidPluginName(pluginName)) {
        console.error(`ERROR: Invalid plugin name: "${pluginName}". Name must be alphanumeric and can contain hyphens, but not start/end with them.`);
        return false;
    }

    const baseDir = baseDirOpt ? path.resolve(baseDirOpt) : path.resolve(process.cwd());
    const pluginDir = path.join(baseDir, pluginName);

    console.log(`INFO: Attempting to create plugin '${pluginName}' in directory: ${pluginDir}`);

    if (fss.existsSync(pluginDir)) {
        if (force) {
            console.warn(`WARN: Plugin directory '${pluginDir}' already exists. --force is enabled, so it will be overwritten.`);
        } else {
            console.error(`ERROR: Plugin directory '${pluginDir}' already exists. Use --force to overwrite.`);
            return false;
        }
    }

    try {
        await fs.mkdir(pluginDir, { recursive: true });

        const filesToCreate = [
            {
                name: `${pluginName}.config.yaml`,
                content: generatePluginConfigYamlContent(pluginName),
            },
            {
                name: `index.js`,
                content: generatePluginIndexJsContent(pluginName),
            },
            {
                name: `${pluginName}.css`,
                content: generatePluginCssContent(pluginName),
            },
            { // New file
                name: `README.md`,
                content: generatePluginReadmeMdContent(pluginName),
            }
        ];

        for (const file of filesToCreate) {
            const filePath = path.join(pluginDir, file.name);
            await fs.writeFile(filePath, file.content);
            console.log(`  Created: ${filePath}`);
        }

        console.log(`INFO: Plugin '${pluginName}' created successfully at ${pluginDir}`);
        console.log(`INFO: Next steps:`);
        console.log(`  1. Customize the generated files in '${pluginDir}', especially README.md and its 'cli_help' section.`);
        console.log(`  2. Register your new plugin in a main config.yaml's 'document_type_plugins' section:`);
        console.log(`     Example: ${pluginName}: "${path.relative(process.cwd(), pluginDir)}/${pluginName}.config.yaml"`);
        return true;

    } catch (error) {
        console.error(`ERROR: Failed to create plugin '${pluginName}': ${error.message}`);
        if (error.stack) console.error(error.stack);
        return false;
    }
}

module.exports = {
    scaffoldPlugin,
};
