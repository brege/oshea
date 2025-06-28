// test/integration/plugins/plugin-manager.test.1.5.8.js
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const PluginManager = require('../../../src/plugins/PluginManager');

describe('PluginManager invokeHandler (1.5.8)', () => {
    let mockDefaultHandler;
    let mockMarkdownUtils;
    let mockPdfGenerator;
    let pluginManagerCoreUtils;
    let pluginManager;
    let consoleErrorStub; // Stub for console.error

    const tempPluginDirPath = path.join(__dirname);
    const tempThrowingPluginFileName = 'temp_mock_throwing_plugin.js';
    const tempThrowingPluginFilePath = path.join(tempPluginDirPath, tempThrowingPluginFileName);

    // Content for a mock plugin whose 'generate' method intentionally throws an error
    const mockThrowingPluginContent = `
        class MockThrowingPlugin {
            constructor(injectedCoreUtils) {
                this.injectedCoreUtils = injectedCoreUtils;
            }
            async generate(data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, pluginBasePath) {
                // Simulate an error being thrown by the plugin's generate method
                throw new Error('Simulated error from plugin generate method.');
            }
        }
        module.exports = MockThrowingPlugin;
    `;

    // Create the temporary mock plugin file once before all tests in this suite
    before(() => {
        fs.writeFileSync(tempThrowingPluginFilePath, mockThrowingPluginContent.trim());
    });

    // Clean up the temporary mock plugin file once after all tests in this suite
    after(() => {
        if (fs.existsSync(tempThrowingPluginFilePath)) {
            fs.unlinkSync(tempThrowingPluginFilePath);
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

        // Stub console.error to capture calls made by PluginManager's internal error handling
        consoleErrorStub = sinon.stub(console, 'error');

        // Clear require cache for the temporary plugin to ensure fresh loading for each test
        delete require.cache[require.resolve(tempThrowingPluginFilePath)];
    });

    afterEach(() => {
        // Restore all stubs, including console.error
        sinon.restore();
    });

    it('should return null and log an error if the plugin\'s generate method throws an error', async () => {
        const pluginName = 'error-throwing-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: { scenario: 'error-test' },
            mainConfig: { debug: true },
            pluginBasePath: '/test/plugins/error-prone',
            handlerScriptPath: tempThrowingPluginFilePath // Path to the mock plugin that throws an error
        };
        const data = { content: 'Data that might cause an error' };
        const outputDir = '/tmp/failed-output';
        const outputFilenameOpt = 'failed-doc.pdf';

        // Invoke the handler; it is expected to catch an internal error and return null
        const result = await pluginManager.invokeHandler(
            pluginName,
            effectiveConfig,
            data,
            outputDir,
            outputFilenameOpt
        );

        // Assert that invokeHandler returned null (indicating an error was handled internally)
        expect(result).to.be.null;

        // Assert that console.error was called for the captured error, matching the expected message
        // PluginManager logs the error message and then the stack trace, so expect the first argument to include the specific message.
        expect(consoleErrorStub.called).to.be.true; // Ensure console.error was called at least once
        expect(consoleErrorStub.args[0][0]).to.include(
            `ERROR invoking handler for plugin '${pluginName}' from '${tempThrowingPluginFilePath}': Simulated error from plugin generate method.`
        );
    });
});
