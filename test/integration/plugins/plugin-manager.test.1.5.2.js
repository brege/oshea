// test/integration/plugins/plugin-manager.test.1.5.2.js
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

describe('PluginManager invokeHandler (1.5.2)', () => {
    let pluginManager;
    let coreUtilsExpected; // Will hold the actual core utility modules for comparison

    const tempPluginDirPath = path.join(__dirname); // Directory of the test file
    const tempPluginFileName = 'temp_mock_class_plugin.js';
    const tempPluginFilePath = path.join(tempPluginDirPath, tempPluginFileName);

    // Content for the temporary mock class-based plugin file
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
                    coreUtilsReceived: this.injectedCoreUtils
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

        // Clear the require cache for the temporary plugin to ensure a fresh module is loaded for each test
        delete require.cache[require.resolve(tempPluginFilePath)];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should successfully load and invoke a class-based plugin handler, ensuring coreUtils are correctly passed to its constructor', async () => {
        const effectiveConfig = {
            pluginSpecificConfig: { testSetting: 'testValue' },
            mainConfig: { globalOption: true },
            pluginBasePath: '/base/path/for/plugin',
            handlerScriptPath: tempPluginFilePath // Path to our mock class plugin
        };
        const data = { markdownFilePath: 'path/to/test.md', content: '# Hello' };
        const outputDir = '/mock/output/directory';
        const outputFilenameOpt = 'final-document.pdf';

        const result = await pluginManager.invokeHandler('class-test-plugin', effectiveConfig, data, outputDir, outputFilenameOpt);

        // 1. Verify the result indicates success from the mock plugin
        expect(result).to.be.an('object');
        expect(result.success).to.be.true;
        expect(result.message).to.equal('Mock PDF generated successfully');

        // 2. Verify that the coreUtils defined internally by PluginManager were correctly passed to the plugin's constructor
        // We now compare against the actual required modules.
        expect(result.coreUtilsReceived).to.deep.equal(coreUtilsExpected);

        // 3. Verify that the plugin's generate method received all the expected arguments
        expect(result.data).to.deep.equal(data);
        expect(result.pluginSpecificConfig).to.deep.equal(effectiveConfig.pluginSpecificConfig);
        expect(result.mainConfig).to.deep.equal(effectiveConfig.mainConfig);
        expect(result.outputDir).to.equal(outputDir);
        expect(result.outputFilenameOpt).to.equal(outputFilenameOpt);
        expect(result.pluginBasePath).to.equal(effectiveConfig.pluginBasePath);
    });
});
