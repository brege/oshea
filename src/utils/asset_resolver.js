// src/utils/asset_resolver.js
const fs = require('fs'); // Using synchronous 'fs' for existsSync
const path = require('path');

class AssetResolver {
    /**
     * Resolves CSS file paths and manages inheritance.
     * @param {Array<string>|undefined} newCssFilePathsRaw - Raw CSS file paths from the current config layer.
     * @param {string} definingConfigDir - The directory of the config file defining these paths.
     * @param {Array<string>} existingCssPaths - Accumulated CSS paths from lower precedence layers.
     * @param {boolean} inheritCssFlag - The inherit_css flag from the current config layer.
     * @param {string} contextPluginName - Name of the plugin for logging.
     * @param {string} contextConfigFilePath - Path of the config file for logging.
     * @returns {Array<string>} The new list of resolved, absolute CSS paths.
     */
    static resolveAndMergeCss(newCssFilePathsRaw, definingConfigDir, existingCssPaths, inheritCssFlag, contextPluginName = 'plugin', contextConfigFilePath = 'config') {
        let resolvedNewCss = [];
        if (newCssFilePathsRaw && Array.isArray(newCssFilePathsRaw)) {
            resolvedNewCss = newCssFilePathsRaw.map(cssFile => {
                if (typeof cssFile !== 'string') {
                    console.warn(`WARN (AssetResolver): Non-string CSS file entry ignored in ${contextConfigFilePath} for ${contextPluginName}: ${cssFile}`);
                    return null;
                }
                if (!definingConfigDir && !path.isAbsolute(cssFile) && !cssFile.startsWith('~/')) {
                     console.warn(`WARN (AssetResolver): Cannot resolve relative CSS path '${cssFile}' in ${contextConfigFilePath} for ${contextPluginName} because definingConfigDir is not available.`);
                    return null;
                }
                let assetPath = cssFile;
                if (assetPath.startsWith('~/') || assetPath.startsWith('~\\')) {
                    assetPath = path.join(require('os').homedir(), assetPath.substring(2));
                }
                if (!path.isAbsolute(assetPath) && definingConfigDir) {
                    assetPath = path.resolve(definingConfigDir, assetPath);
                }

                if (!fs.existsSync(assetPath)) {
                    console.warn(`WARN (AssetResolver): CSS file not found: ${assetPath} (referenced in ${contextConfigFilePath} for ${contextPluginName})`);
                    return null;
                }
                return assetPath;
            }).filter(Boolean);
        }

        if (newCssFilePathsRaw !== undefined) { // If css_files key was present in the current layer
            if (inheritCssFlag) {
                return [...existingCssPaths, ...resolvedNewCss];
            } else {
                return resolvedNewCss; // Replace
            }
        }
        return existingCssPaths; // No change if css_files key wasn't in the current layer
    }
}

module.exports = AssetResolver;
