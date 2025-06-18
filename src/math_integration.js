// src/math_integration.js

/**
 * @fileoverview Module for math rendering integration, initially supporting KaTeX.
 */

// Factory function to create the math integration module, allowing dependency injection
function createMathIntegration(dependencies = {}) {
    const fs_promises = dependencies.fsPromises || require('fs').promises;
    const fss = dependencies.fsSync || require('fs'); // For existsSync
    const path_module = dependencies.path || require('path');

    const katexPluginModule = dependencies.katexPluginModule || require('@vscode/markdown-it-katex');

    const KATEX_CSS_PATH = path_module.resolve(__dirname, '../assets/css/katex.min.css');

    /**
     * Configures a MarkdownIt instance for math rendering using KaTeX.
     * @param {Object} mdInstance - The MarkdownIt instance.
     * @param {Object} mathConfig - The math rendering configuration object.
     */
    function configureMarkdownItForMath(mdInstance, mathConfig) {
        if (mathConfig && mathConfig.enabled && mathConfig.engine === 'katex') {
            let currentKatexPluginModule = katexPluginModule; 
            
            let pluginFunction = currentKatexPluginModule;

            if (currentKatexPluginModule && typeof currentKatexPluginModule.default === 'function') {
                pluginFunction = currentKatexPluginModule.default;
            } else if (typeof currentKatexPluginModule !== 'function') {
                console.error("ERROR: The resolved KaTeX plugin (or its .default) is not a function. Cannot apply to markdown-it.");
                console.error("ERROR: Actual loaded module was:", currentKatexPluginModule);
                return;
            }
            
            const currentKatexOptions = mathConfig.katex_options || {};
            
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
                    const cssContent = await fs_promises.readFile(KATEX_CSS_PATH, 'utf8'); 
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

    return {
        configureMarkdownItForMath,
        getMathCssContent,
    };
}

module.exports = createMathIntegration;
