// test/integration/plugins/plugin-manager.test.1.5.3.js
const { defaultHandlerPath, markdownUtilsPath, pdfGeneratorPath, pluginManagerPath } = require('@paths');
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// Import the actual core utility modules that PluginManager now directly uses
const DefaultHandler = require(defaultHandlerPath);
const markdownUtils = require(markdownUtilsPath);
const pdfGenerator = require(pdfGeneratorPath);

const PluginManager = require(pluginManagerPath);

describe('PluginManager invokeHandler (1.5.3)', () => {
    let pluginManager;
    let coreUtilsExpected; // Will hold the actual core utility modules for comparison

    const tempPluginDirPath = path.join(__dirname); // Directory of the test file
    const tempPluginFileName = 'temp_mock_class_plugin.js';
    const tempPluginFilePath = path.join(tempPluginDirPath, tempPluginFileName);

    // Content for the temporary mock class-based plugin file.
    // The generate method returns all received arguments for assertion.
    const mockClassPluginContent = `
        class MockClassPlugin {
            constructor(injectedCoreUtils) {
                this.injectedCoreUtils = injectedCoreUtils;
            }
            async generate(data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, pluginBasePath) {
                return {
                    success: true,
                    message: 'Mock PDF generated successfully',
                    data,
                    pluginSpecificConfig,
                    mainConfig,
                    outputDir,
                    outputFilenameOpt,
                    pluginBasePath,
                    coreUtilsReceived: this.injectedCoreUtils // Confirm coreUtils were passed to constructor
                };
            }
        }
        module.exports = MockClassPlugin;
    `;

    // Create the temporary mock plugin file once before all tests in this suite
    before(() => {
        fs.writeFileSync(tempPluginFilePath, mockClassPluginContent.trim());

        // Define coreUtilsExpected using the actual imported modules
        coreUtilsExpected = {
            DefaultHandler,
            markdownUtils,
            pdfGenerator
        };
    });

    // Clean up the temporary mock plugin file once after all tests in this suite
    after(() => {
        if (fs.existsSync(tempPluginFilePath)) {
            fs.unlinkSync(tempPluginFilePath);
        }
    });

    beforeEach(() => {
        // Instantiate PluginManager without arguments as it no longer accepts injected coreUtils
        pluginManager = new PluginManager();

        // Clear the require cache for the temporary plugin to ensure a fresh module is loaded for each test.
        delete require.cache[require.resolve(tempPluginFilePath)];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly pass data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, and pluginBasePath to the plugin\'s generate method', async () => {
        const effectiveConfig = {
            pluginSpecificConfig: { section: 'header', type: 'h1' },
            mainConfig: { globalTheme: 'dark', version: '1.0' },
            pluginBasePath: '/usr/local/plugins/my-plugin',
            handlerScriptPath: tempPluginFilePath // Path to our mock class plugin
        };
        const data = { markdownContent: '## Test Content', images: ['img1.png'] };
        const outputDir = '/app/output/reports';
        const outputFilenameOpt = 'project-report.pdf';
        const pluginName = 'report-generator-plugin'; // Name of the plugin being invoked

        // Invoke the handler with all required arguments
        const result = await pluginManager.invokeHandler(
            pluginName,
            effectiveConfig,
            data,
            outputDir,
            outputFilenameOpt
        );

        // Verify the result indicates success from the mock plugin (setup to return passed arguments)
        expect(result).to.be.an('object');
        expect(result.success).to.be.true;
        expect(result.message).to.equal('Mock PDF generated successfully');

        // Assert that each argument passed to invokeHandler was correctly forwarded to the plugin's generate method
        expect(result.data).to.deep.equal(data);
        expect(result.pluginSpecificConfig).to.deep.equal(effectiveConfig.pluginSpecificConfig);
        expect(result.mainConfig).to.deep.equal(effectiveConfig.mainConfig);
        expect(result.outputDir).to.equal(outputDir);
        expect(result.outputFilenameOpt).to.equal(outputFilenameOpt);
        expect(result.pluginBasePath).to.equal(effectiveConfig.pluginBasePath);

        // Also confirm coreUtils were passed to the plugin's constructor, by comparing to the actual modules
        expect(result.coreUtilsReceived).to.deep.equal(coreUtilsExpected);
    });
});
