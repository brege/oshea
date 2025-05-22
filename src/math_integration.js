// src/math_integration.js

/**
 * @fileoverview Module for math rendering integration, initially supporting KaTeX.
 */

const fs = require('fs').promises;
const fss = require('fs'); // For existsSync
const path = require('path');

// Corrected path assuming katex.min.css is in 'assets/css/' relative to project root
// and this script is in 'src/'
const KATEX_CSS_PATH = path.resolve(__dirname, '../assets/css/katex.min.css');

/**
 * Configures a MarkdownIt instance for math rendering using KaTeX.
 * @param {Object} mdInstance - The MarkdownIt instance.
 * @param {Object} mathConfig - The math rendering configuration object.
 */
function configureMarkdownItForMath(mdInstance, mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
        let katexPluginModule;
        try {
            katexPluginModule = require('@vscode/markdown-it-katex');
        } catch (e) {
            console.error("ERROR: Failed to require '@vscode/markdown-it-katex'. Make sure it's installed.", e);
            return; 
        }

        // console.log("INFO: Successfully required '@vscode/markdown-it-katex'. Type:", typeof katexPluginModule); // Kept for verbosity if needed, can be removed
        
        let pluginFunction = katexPluginModule;
        if (katexPluginModule && typeof katexPluginModule.default === 'function') {
            // console.log("INFO: Using .default export from '@vscode/markdown-it-katex' as the plugin function."); // Kept for verbosity
            pluginFunction = katexPluginModule.default;
        } else if (typeof katexPluginModule !== 'function') {
            console.error("ERROR: The resolved KaTeX plugin (or its .default) is not a function. Cannot apply to markdown-it.");
            console.error("ERROR: Actual loaded module was:", katexPluginModule);
            return;
        }
        
        const currentKatexOptions = mathConfig.katex_options || {};
        // console.log("INFO: Applying KaTeX plugin to markdown-it with options:", JSON.stringify(currentKatexOptions, null, 2)); // Kept for verbosity
        
        try {
            mdInstance.use(pluginFunction, currentKatexOptions);
            console.log("INFO: KaTeX math rendering enabled for markdown-it (md.use successful).");
        } catch (useError) {
            console.error("ERROR: mdInstance.use(katexPlugin) failed directly:", useError);
            if (useError.stack) {
                console.error(useError.stack);
            }
        }
    }
}

/**
 * Retrieves the content of the KaTeX CSS file if math rendering is enabled.
 * @param {Object} mathConfig - The math rendering configuration object.
 * @returns {Promise<Array<string>>} A promise that resolves to an array containing KaTeX CSS content as a string,
 * or an empty array if not applicable or file not found.
 */
async function getMathCssContent(mathConfig) {
    if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
        console.log(`[math_integration.js] getMathCssContent: Checking for KaTeX CSS at ${KATEX_CSS_PATH}`); 

        if (fss.existsSync(KATEX_CSS_PATH)) {
            try {
                const cssContent = await fs.readFile(KATEX_CSS_PATH, 'utf8');
                console.log("INFO: KaTeX CSS loaded.");
                return [cssContent];
            } catch (error) {
                console.warn(`WARN: Could not read KaTeX CSS file from ${KATEX_CSS_PATH}: ${error.message}`);
                return [];
            }
        } else {
            console.warn(`WARN: KaTeX CSS file not found at expected path: ${KATEX_CSS_PATH}. Math rendering might not be styled correctly.`);
            return [];
        }
    }
    return [];
}

module.exports = {
    configureMarkdownItForMath,
    getMathCssContent,
};
