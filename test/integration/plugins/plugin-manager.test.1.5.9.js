// test/integration/plugin-manager/plugin-manager.test.1.5.9.js
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const PluginManager = require('../../../src/PluginManager');

describe('PluginManager invokeHandler (1.5.9)', () => {
    let mockDefaultHandler;
    let mockMarkdownUtils;
    let mockPdfGenerator;
    let pluginManagerCoreUtils;
    let pluginManager;

    const tempPluginDirPath = path.join(__dirname);
    const tempPluginFileName = 'temp_mock_successful_plugin.js'; // Using a distinct name for clarity, but logic is similar to 1.5.2/1.5.3
    const tempPluginFilePath = path.join(tempPluginDirPath, tempPluginFileName);

    // Content for a mock class-based plugin whose 'generate' method returns a specific, predictable value.
    const mockSuccessfulPluginContent = `
        class MockSuccessfulPlugin {
            constructor(injectedCoreUtils) {
                this.injectedCoreUtils = injectedCoreUtils;
            }
            async generate(data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, pluginBasePath) {
                // This value represents the successful resolution of the plugin's task, e.g., a PDF path.
                return {
                    pdfPath: '/generated/documents/output_report.pdf',
                    status: 'success',
                    processedData: data,
                    pluginConfigUsed: pluginSpecificConfig
                };
            }
        }
        module.exports = MockSuccessfulPlugin;
    `;

    // Create the temporary mock plugin file once before all tests in this suite
    before(() => {
        fs.writeFileSync(tempPluginFilePath, mockSuccessfulPluginContent.trim());
    });

    // Clean up the temporary mock plugin file once after all tests in this suite
    after(() => {
        if (fs.existsSync(tempPluginFilePath)) {
            fs.unlinkSync(tempPluginFilePath);
        }
    });

    beforeEach(() => {
        // Setup mock core utilities for PluginManager's constructor
        mockDefaultHandler = sinon.stub();
        mockMarkdownUtils = sinon.stub();
        mockPdfGenerator = sinon.stub();

        pluginManagerCoreUtils = {
            DefaultHandler: mockDefaultHandler,
            markdownUtils: mockMarkdownUtils,
            pdfGenerator: mockPdfGenerator
        };

        // Instantiate PluginManager with the mocked core utilities
        pluginManager = new PluginManager(pluginManagerCoreUtils);

        // Clear require cache for the temporary plugin to ensure fresh loading for each test
        delete require.cache[require.resolve(tempPluginFilePath)];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return the promise resolution (e.g., path to PDF) from the successfully invoked plugin\'s generate method', async () => {
        const pluginName = 'successful-result-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: { outputFormat: 'standard' },
            mainConfig: { logLevel: 'debug' },
            pluginBasePath: '/test/plugins/successful-gen',
            handlerScriptPath: tempPluginFilePath // Path to our mock successful plugin
        };
        const data = { documentId: 'doc-xyz', content: 'Some valid markdown.' };
        const outputDir = '/tmp/final-output';
        const outputFilenameOpt = 'final-document.pdf';

        // Define the expected return value from the mock plugin's generate method
        const expectedPluginReturnValue = {
            pdfPath: '/generated/documents/output_report.pdf',
            status: 'success',
            processedData: data,
            pluginConfigUsed: effectiveConfig.pluginSpecificConfig
        };

        // Invoke the handler
        const result = await pluginManager.invokeHandler(
            pluginName,
            effectiveConfig,
            data,
            outputDir,
            outputFilenameOpt
        );

        // Assert that the result returned by invokeHandler exactly matches the expected value from the plugin
        expect(result).to.deep.equal(expectedPluginReturnValue);
    });
});
