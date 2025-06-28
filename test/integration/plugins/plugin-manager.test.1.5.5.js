// test/integration/plugins/plugin-manager.test.1.5.5.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// Removed chai-as-promised dependencies as per your suggestion.

const PluginManager = require('../../../src/plugins/PluginManager');

describe('PluginManager invokeHandler (1.5.5)', () => {
    let mockDefaultHandler;
    let mockMarkdownUtils;
    let mockPdfGenerator;
    let pluginManagerCoreUtils;
    let pluginManager;

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
    });

    afterEach(() => {
        sinon.restore(); // Restore all stubs
    });

    it('should throw an error if effectiveConfig.handlerScriptPath is missing', async () => {
        const pluginName = 'missing-path-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: {},
            mainConfig: {},
            pluginBasePath: '/some/base/path',
            // handlerScriptPath is intentionally omitted here
        };
        const data = { input: 'some data' };
        const outputDir = '/temp/output';
        const outputFilenameOpt = 'output.pdf';

        let thrownError = null;
        try {
            // Await the promise. If it resolves, the test should fail.
            await pluginManager.invokeHandler(
                pluginName,
                effectiveConfig,
                data,
                outputDir,
                outputFilenameOpt
            );
            // If the above line does not throw, explicitly fail the test
            expect.fail('Expected invokeHandler to throw an error, but it did not.');
        } catch (error) {
            thrownError = error;
        }

        // Assert that an error was caught and its properties match expectations
        expect(thrownError).to.be.an.instanceOf(Error);
        expect(thrownError.message).to.equal(`Handler script path not available in effectiveConfig for plugin '${pluginName}'.`);
    });

    it('should throw an error if effectiveConfig.handlerScriptPath is undefined', async () => {
        const pluginName = 'undefined-path-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: {},
            mainConfig: {},
            pluginBasePath: '/another/base/path',
            handlerScriptPath: undefined // handlerScriptPath is explicitly set to undefined
        };
        const data = { input: 'another data' };
        const outputDir = '/temp/output';
        const outputFilenameOpt = 'another-output.pdf';

        let thrownError = null;
        try {
            // Await the promise. If it resolves, the test should fail.
            await pluginManager.invokeHandler(
                pluginName,
                effectiveConfig,
                data,
                outputDir,
                outputFilenameOpt
            );
            // If the above line does not throw, explicitly fail the test
            expect.fail('Expected invokeHandler to throw an error, but it did not.');
        } catch (error) {
            thrownError = error;
        }

        // Assert that an error was caught and its properties match expectations
        expect(thrownError).to.be.an.instanceOf(Error);
        expect(thrownError.message).to.equal(`Handler script path not available in effectiveConfig for plugin '${pluginName}'.`);
    });
});
