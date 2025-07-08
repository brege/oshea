// test/integration/plugins/plugin-manager.manifest.js
const { makePluginManagerScenario } = require('./plugin-manager.factory');
const { defaultHandlerPath, markdownUtilsPath, pdfGeneratorPath } = require('@paths');

// Replicate the coreUtils object that the real PluginManager uses internally for assertions
const coreUtilsExpected = {
  DefaultHandler: require(defaultHandlerPath),
  markdownUtils: require(markdownUtilsPath),
  pdfGenerator: require(pdfGeneratorPath),
};

module.exports = [
    makePluginManagerScenario({
        description: '1.5.1: should initialize without throwing errors',
        pluginType: 'class',
        expectedResult: { success: true },
    }),
    makePluginManagerScenario({
        description: '1.5.2: should correctly pass coreUtils to a class-based plugin constructor',
        pluginType: 'class',
        expectedResult: { success: true, coreUtilsReceived: true }, // Expect the property to exist
    }),
    makePluginManagerScenario({
        description: '1.5.3: should correctly pass all arguments to the plugin\'s generate method',
        pluginType: 'class',
        data: { markdownContent: '## Test' },
        effectiveConfig: {
            pluginSpecificConfig: { section: 'header' },
            mainConfig: { globalTheme: 'dark' },
            pluginBasePath: '/usr/local/plugins/my-plugin',
        },
        outputDir: '/app/output/reports',
        outputFilenameOpt: 'report.pdf',
        expectedResult: { success: true },
    }),
    makePluginManagerScenario({
        description: '1.5.4: should invoke an object-based plugin and log a warning',
        pluginType: 'object',
        expectedResult: { success: true },
        expectedLog: /Plugin 'test-plugin' is not a class/,
    }),
    makePluginManagerScenario({
        description: '1.5.5: should throw an error if handlerScriptPath is missing',
        pluginType: 'class',
        isNegativeTest: true,
        effectiveConfig: { handlerScriptPath: null },
        expectedErrorMessage: /Handler script path not available/,
    }),
    makePluginManagerScenario({
        description: '1.5.6: should return null and log an error for an invalid handler module (plain function)',
        pluginType: 'function',
        expectedError: 'does not have a \'generate\' method',
    }),
    makePluginManagerScenario({
        description: '1.5.7: should return null and log an error if a class instance has no generate method',
        pluginType: 'class-no-generate',
        expectedError: "does not have a 'generate' method",
    }),
    makePluginManagerScenario({
        description: '1.5.8: should return null and log an error if the plugin\'s generate method throws',
        pluginType: 'throwing',
        expectedError: 'Simulated error from plugin',
    }),
    makePluginManagerScenario({
        description: '1.5.9: should return the promise resolution from a successful generate method',
        pluginType: 'class',
        expectedResult: { status: 'complete', path: '/path/to/file.pdf' },
    }),
];
