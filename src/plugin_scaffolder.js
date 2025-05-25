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
  format: "Letter"
  margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" }
math:
  enabled: false 
`;
}

/**
 * Generates the content for the index.js handler file.
 * @param {string} pluginName - The name of the plugin.
 * @returns {string} The JavaScript content.
 */
function generatePluginIndexJsContent(pluginName) {
    const className = pluginName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    return `// ${pluginName}/index.js
class ${className}Handler {
    constructor(coreUtils) {
        this.handler = new coreUtils.DefaultHandler();
    }

    async generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath) {
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
`;
}


/**
 * Main function to scaffold a new plugin.
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
            { 
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
        console.log(`  2. Register your new plugin in a main config.yaml's 'plugins' section:`); 
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
