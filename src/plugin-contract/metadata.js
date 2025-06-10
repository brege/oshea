const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Universal metadata lookup function.
 * @param {string} pluginDirectoryPath - The absolute path to the plugin's root directory.
 * @param {string} pluginName - The name of the plugin (directory name).
 * @param {Array<string>} warnings - Array to push warnings into.
 * @returns {object} - An object containing the resolved metadata.
 */
function getPluginMetadata(pluginDirectoryPath, pluginName, warnings) {
    const metadata = {
        plugin_name: { value: undefined, source: undefined },
        version: { value: undefined, source: undefined },
        protocol: { value: undefined, source: undefined },
    };

    console.log(chalk.cyan(`Resolving plugin metadata for '${pluginName}'...`));

    const readJsonFile = (filePath) => {
        if (fs.existsSync(filePath)) {
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                warnings.push(`Could not parse JSON from '${path.basename(filePath)}'.`);
            }
        }
        return null;
    };

    const readYamlFile = (filePath) => {
        if (fs.existsSync(filePath)) {
            try {
                return yaml.load(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                warnings.push(`Could not parse YAML from '${path.basename(filePath)}'.`);
            }
        }
        return null;
    };

    const readReadmeFrontMatter = (readmePath) => {
        if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');
            const frontMatterDelimiter = '---';
            const parts = readmeContent.split(frontMatterDelimiter);
            if (parts.length >= 3 && parts[0].trim() === '') {
                try {
                    return yaml.load(parts[1]);
                } catch (e) {
                    warnings.push(`Could not parse YAML front matter from '${path.basename(readmePath)}'.`);
                }
            }
        }
        return null;
    };

    const schemaPath = path.join(pluginDirectoryPath, `${pluginName}.schema.json`);
    const schemaContent = readJsonFile(schemaPath);
    if (schemaContent) {
        if (schemaContent.plugin_name) metadata.plugin_name = { value: schemaContent.plugin_name, source: 'schema' };
        if (schemaContent.version) metadata.version = { value: schemaContent.version, source: 'schema' };
        if (schemaContent.protocol) metadata.protocol = { value: schemaContent.protocol, source: 'schema' };
    }

    const configPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);
    const configContent = readYamlFile(configPath);
    if (configContent) {
        if (configContent.plugin_name && !metadata.plugin_name.value) metadata.plugin_name = { value: configContent.plugin_name, source: 'config' };
        if (configContent.version && !metadata.version.value) metadata.version = { value: configContent.version, source: 'config' };
        if (configContent.protocol && !metadata.protocol.value) metadata.protocol = { value: configContent.protocol, source: 'config' };
    }

    const readmePath = path.join(pluginDirectoryPath, 'README.md');
    const readmeFrontMatter = readReadmeFrontMatter(readmePath);
    if (readmeFrontMatter) {
        if (readmeFrontMatter.plugin_name && !metadata.plugin_name.value) metadata.plugin_name = { value: readmeFrontMatter.plugin_name, source: 'README' };
        if (readmeFrontMatter.version && !metadata.version.value) metadata.version = { value: readmeFrontMatter.version, source: 'README' };
        if (readmeFrontMatter.protocol && !metadata.protocol.value) metadata.protocol = { value: readmeFrontMatter.protocol, source: 'README' };
    }

    if (!metadata.plugin_name.value) {
        metadata.plugin_name = { value: pluginName, source: 'default (directory name)' };
        warnings.push(`Plugin name not found. Defaulting to directory name: '${pluginName}'.`);
    }
    if (!metadata.version.value) {
        warnings.push(`Plugin version not found.`);
    }
    if (!metadata.protocol.value) {
        metadata.protocol = { value: 'v1', source: 'default (v1)' };
        warnings.push(`Plugin protocol not found. Defaulting to 'v1'.`);
    }

    metadata.protocol.value = String(metadata.protocol.value);

    return metadata;
}

module.exports = getPluginMetadata;
