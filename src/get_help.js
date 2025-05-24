// src/get_help.js
const fs = require('fs').promises;
const fss = require('fs'); // Synchronous
const path = require('path');
const { extractFrontMatter } = require('./markdown_utils');
const PluginRegistryBuilder = require('./PluginRegistryBuilder');
const yaml = require('js-yaml'); // Moved to top-level require

async function displayPluginHelp(pluginName, cliArgs) {
    // cliArgs might contain --config, --factory-defaults which are needed for PluginRegistryBuilder
    console.log(`INFO: Attempting to display help for plugin: ${pluginName}`);

    try {
        const registryBuilder = new PluginRegistryBuilder(
            path.resolve(__dirname, '..'), // projectRoot
            null, // xdgBaseDir (let builder determine)
            cliArgs.config, // projectManifestConfigPath from CLI
            cliArgs.factoryDefaults // useFactoryDefaultsOnly from CLI
        );

        const pluginRegistry = await registryBuilder.buildRegistry();
        const pluginRegistration = pluginRegistry[pluginName];

        if (!pluginRegistration || !pluginRegistration.configPath) {
            console.error(`ERROR: Plugin "${pluginName}" not found or not properly registered.`);
            console.log("You can list available plugins using: md-to-pdf plugin list");
            return;
        }

        const pluginBasePath = path.dirname(pluginRegistration.configPath);
        const readmePath = path.join(pluginBasePath, 'README.md');

        if (!fss.existsSync(readmePath)) {
            console.warn(`WARN: README.md not found for plugin "${pluginName}" at ${readmePath}.`);
            console.log(`No specific help available. Description from config:`);
            try {
                 const pluginConfigContent = await fs.readFile(pluginRegistration.configPath, 'utf8');
                 const pluginConfig = yaml.load(pluginConfigContent);
                 if (pluginConfig && pluginConfig.description) {
                    console.log(`  ${pluginConfig.description}`);
                 } else {
                    console.log("  No description found in plugin's config file either.");
                 }
            } catch (e) {
                console.log("  Could not load plugin description.");
            }
            return;
        }

        const readmeContent = await fs.readFile(readmePath, 'utf8');
        const { data: frontMatter } = extractFrontMatter(readmeContent);

        if (frontMatter && frontMatter.cli_help) {
            console.log("\n--- Plugin Help ---\n");
            console.log(frontMatter.cli_help.trim());
            console.log("\n-------------------\n");
        } else {
            console.warn(`WARN: No 'cli_help' section found in the front matter of README.md for plugin "${pluginName}".`);
            console.log("Displaying plugin description from its configuration file as fallback:");
             try {
                 const pluginConfigContent = await fs.readFile(pluginRegistration.configPath, 'utf8');
                 const pluginConfig = yaml.load(pluginConfigContent);
                 if (pluginConfig && pluginConfig.description) {
                    console.log(`  ${pluginConfig.description}`);
                 } else {
                    console.log("  No description found in plugin's config file.");
                 }
            } catch (e) {
                console.log("  Could not load plugin description.");
            }
        }

    } catch (error) {
        console.error(`ERROR: Could not retrieve help for plugin "${pluginName}": ${error.message}`);
        if (error.stack && !(cliArgs.watch)) console.error(error.stack); // Avoid stack trace in watch mode for this error
    }
}

module.exports = {
    displayPluginHelp,
};
