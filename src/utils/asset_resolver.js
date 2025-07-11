// src/utils/asset_resolver.js
const fs = require('fs');
const path = require('path');
const { logger } = require('@paths');

class AssetResolver {
  static resolveAndMergeCss(newCssFilePathsRaw, definingConfigDir, existingCssPaths, inheritCssFlag, contextPluginName = 'plugin', contextConfigFilePath = 'config') {
    let resolvedNewCss = [];
    if (newCssFilePathsRaw && Array.isArray(newCssFilePathsRaw)) {
      resolvedNewCss = newCssFilePathsRaw.map(cssFile => {
        if (typeof cssFile !== 'string') {
          logger.warn(`Non-string CSS file entry ignored in ${contextConfigFilePath} for ${contextPluginName}: ${cssFile}`, { module: 'src/utils/asset_resolver.js' });
          return null;
        }
        if (!definingConfigDir && !path.isAbsolute(cssFile) && !cssFile.startsWith('~/')) {
          logger.warn(`Cannot resolve relative CSS path '${cssFile}' in ${contextConfigFilePath} for ${contextPluginName} because definingConfigDir is not available.`, { module: 'src/utils/asset_resolver.js' });
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
          logger.warn(`CSS file not found: ${assetPath} (referenced in ${contextConfigFilePath} for ${contextPluginName})`, { module: 'src/utils/asset_resolver.js' });
          return null;
        }
        return assetPath;
      }).filter(Boolean);
    }

    if (newCssFilePathsRaw !== undefined) {
      if (inheritCssFlag) {
        return [...existingCssPaths, ...resolvedNewCss];
      } else {
        return resolvedNewCss;
      }
    }
    return existingCssPaths;
  }
}

module.exports = AssetResolver;
