// src/math_integration.js

/**
 * @fileoverview Placeholder module for math rendering integration.
 * In Step 0, its functions are stubs and do not implement actual math rendering.
 */

/**
 * Placeholder for configuring MarkdownIt instance for math rendering.
 * This function will be implemented in a later step to actually add KaTeX support.
 * @param {Object} mdInstance - The MarkdownIt instance.
 * @param {Object} mathRenderingConfig - The math rendering configuration object,
 * which would contain 'enabled', 'engine', and 'katex_options'.
 */
function configureMarkdownItForMath(mdInstance, mathRenderingConfig) {
    // In Step 0, this function is a stub.
    // It might log if needed for debugging the hook-up:
    // if (mathRenderingConfig && mathRenderingConfig.enabled) {
    //     console.log('[Stub] math_integration.configureMarkdownItForMath called with config:', mathRenderingConfig);
    // }
    // No actual math plugin is applied to mdInstance here.
}

/**
 * Placeholder for getting math-specific CSS content.
 * This function will be implemented later to read KaTeX CSS.
 * @param {Object} mathRenderingConfig - The math rendering configuration object.
 * @returns {Promise<Array<string>>} A promise that resolves to an empty array in Step 0.
 */
async function getMathCssContent(mathRenderingConfig) {
    // In Step 0, this function is a stub.
    // if (mathRenderingConfig && mathRenderingConfig.enabled) {
    //     console.log('[Stub] math_integration.getMathCssContent called with config:', mathRenderingConfig);
    // }
    return []; // Returns an empty array, so no CSS is added yet.
}

module.exports = {
    configureMarkdownItForMath,
    getMathCssContent,
};
