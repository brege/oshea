// test/integration/plugins/plugin-manager.test.1.5.7.js
const { pluginManagerPath } = require('@paths');
const path = require('path');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const PluginManager = require(pluginManagerPath);

describe('PluginManager invokeHandler (1.5.7)', () => {
  let mockDefaultHandler;
  let mockMarkdownUtils;
  let mockPdfGenerator;
  let pluginManagerCoreUtils;
  let pluginManager;
  let consoleErrorStub; // Stub for console.error

  const tempPluginDirPath = path.join(__dirname);
  const tempClassNoGenerateFileName = 'temp_mock_class_no_generate.js';
  const tempClassNoGenerateFilePath = path.join(tempPluginDirPath, tempClassNoGenerateFileName);

  // Content for a mock class that is correctly identified as a class,
  // but intentionally does NOT define a 'generate' method.
  const mockClassNoGenerateContent = `
        class MockClassNoGenerate {
            constructor(injectedCoreUtils) {
                this.injectedCoreUtils = injectedCoreUtils;
            }
            // Intentionally no 'generate' method here.
            someOtherMethod() {
                return 'This is another method';
            }
        }
        module.exports = MockClassNoGenerate;
    `;

  // Create the temporary mock plugin file once before all tests in this suite
  before(() => {
    fs.writeFileSync(tempClassNoGenerateFilePath, mockClassNoGenerateContent.trim());
  });

  // Clean up the temporary mock plugin file once after all tests in this suite
  after(() => {
    if (fs.existsSync(tempClassNoGenerateFilePath)) {
      fs.unlinkSync(tempClassNoGenerateFilePath);
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
    delete require.cache[require.resolve(tempClassNoGenerateFilePath)];
  });

  afterEach(() => {
    // Restore all stubs, including console.error
    sinon.restore();
  });

  it('should return null and log an error if the handler instance (class) does not have a generate method', async () => {
    const pluginName = 'class-missing-generate-plugin';
    const effectiveConfig = {
      pluginSpecificConfig: { setting: 'value' },
      mainConfig: { global: 'config' },
      pluginBasePath: '/test/plugins/my-class-plugin',
      handlerScriptPath: tempClassNoGenerateFilePath // Path to the mock class without generate method
    };
    const data = { document: 'my document' };
    const outputDir = '/tmp/generated-pdfs';
    const outputFilenameOpt = 'document.pdf';

    // Invoke the handler; it is expected to create an instance and then fail due to missing 'generate'
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
    // PluginManager logs the error message and then the stack trace, so expect at least one call to `console.error`
    expect(consoleErrorStub.called).to.be.true;
    expect(consoleErrorStub.args[0][0]).to.include(
      `ERROR invoking handler for plugin '${pluginName}' from '${tempClassNoGenerateFilePath}': Handler instance for plugin '${pluginName}' does not have a 'generate' method.`
    );
  });
});
