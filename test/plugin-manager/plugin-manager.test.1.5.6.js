const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const PluginManager = require('../../src/PluginManager');

describe('PluginManager invokeHandler (1.5.6)', () => {
    let mockDefaultHandler;
    let mockMarkdownUtils;
    let mockPdfGenerator;
    let pluginManagerCoreUtils;
    let pluginManager;
    let consoleErrorStub; // Stub for console.error

    const tempPluginDirPath = path.join(__dirname);

    // Content for a mock plugin exporting a plain function (not a class or object with generate)
    const tempFunctionPluginFileName = 'temp_mock_invalid_plugin_function.js';
    const tempFunctionPluginFilePath = path.join(tempPluginDirPath, tempFunctionPluginFileName);
    const mockFunctionPluginContent = `
        module.exports = function() {
            // This function is neither a class nor an object with a 'generate' method
        };
    `;

    // Content for a mock plugin exporting a plain object without a 'generate' method
    const tempObjectNoGenerateFileName = 'temp_mock_invalid_plugin_object_no_generate.js';
    const tempObjectNoGenerateFilePath = path.join(tempPluginDirPath, tempObjectNoGenerateFileName);
    const mockObjectNoGenerateContent = `
        module.exports = {
            someProperty: 'value',
            anotherMethod: () => 'test'
            // Missing a 'generate' method
        };
    `;

    // Create temporary mock plugin files before all tests in this suite
    before(() => {
        fs.writeFileSync(tempFunctionPluginFilePath, mockFunctionPluginContent.trim());
        fs.writeFileSync(tempObjectNoGenerateFilePath, mockObjectNoGenerateContent.trim());
    });

    // Clean up temporary mock plugin files after all tests in this suite
    after(() => {
        if (fs.existsSync(tempFunctionPluginFilePath)) {
            fs.unlinkSync(tempFunctionPluginFilePath);
        }
        if (fs.existsSync(tempObjectNoGenerateFilePath)) {
            fs.unlinkSync(tempObjectNoGenerateFilePath);
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

        // Clear require cache for the temporary plugins to ensure fresh loading for each test
        delete require.cache[require.resolve(tempFunctionPluginFilePath)];
        delete require.cache[require.resolve(tempObjectNoGenerateFilePath)];
    });

    afterEach(() => {
        // Restore all stubs, including console.error
        sinon.restore();
    });

    it('should return null and log an error if the loaded module exports a plain function (not a class or object with generate)', async () => {
        const pluginName = 'invalid-function-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: {},
            mainConfig: {},
            pluginBasePath: '/test/plugins/invalid-func',
            handlerScriptPath: tempFunctionPluginFilePath // Path to the mock plain function plugin
        };
        const data = { input: 'some input' };
        const outputDir = '/tmp/invalid-output';
        const outputFilenameOpt = 'invalid-func.pdf';

        // Invoke the handler; it is expected to catch an internal error and return null
        const result = await pluginManager.invokeHandler(
            pluginName,
            effectiveConfig,
            data,
            outputDir,
            outputFilenameOpt
        );

        // Assert that invokeHandler returned null
        expect(result).to.be.null;

        // Assert that console.error was called for the captured error, matching the expected message
        // The console.error is called twice in PluginManager (once for message, once for stack)
        expect(consoleErrorStub.called).to.be.true;
        expect(consoleErrorStub.args[0][0]).to.include(
            `ERROR invoking handler for plugin '${pluginName}' from '${tempFunctionPluginFilePath}': Handler instance for plugin '${pluginName}' does not have a 'generate' method.`
        );
    });

    it('should return null and log an error if the loaded module exports an object without a generate function', async () => {
        const pluginName = 'invalid-object-plugin';
        const effectiveConfig = {
            pluginSpecificConfig: {},
            mainConfig: {},
            pluginBasePath: '/test/plugins/invalid-obj',
            handlerScriptPath: tempObjectNoGenerateFilePath // Path to the mock object without generate
        };
        const data = { input: 'more input' };
        const outputDir = '/tmp/another-invalid-output';
        const outputFilenameOpt = 'invalid-obj.pdf';

        // Invoke the handler; it is expected to catch an internal error and return null
        const result = await pluginManager.invokeHandler(
            pluginName,
            effectiveConfig,
            data,
            outputDir,
            outputFilenameOpt
        );

        // Assert that invokeHandler returned null
        expect(result).to.be.null;

        // Assert that console.error was called for the captured error, matching the expected message
        // The console.error is called twice in PluginManager (once for message, once for stack)
        expect(consoleErrorStub.called).to.be.true;
        expect(consoleErrorStub.args[0][0]).to.include(
            `ERROR invoking handler for plugin '${pluginName}' from '${tempObjectNoGenerateFilePath}': Handler module '${tempObjectNoGenerateFilePath}' for plugin '${pluginName}' does not export a class or a 'generate' function.`
        );
    });
});
