// test/runners/integration/plugins/plugin-manager.factory.js
const path = require('node:path');
const fs = require('node:fs');

function makePluginManagerScenario({
  description,
  pluginType,
  effectiveConfig = {},
  data = {},
  outputDir = '/tmp/output',
  outputFilenameOpt = 'output.pdf',
  expectedResult,
  expectedError,
  expectedLog,
  isNegativeTest = false,
  expectedErrorMessage = '',
}) {
  const setup = async (mocks, { tempDir }) => {
    let content = '';
    const mockPluginFileName = `mock_${pluginType}_plugin.js`;
    const mockPluginFilePath = path.join(tempDir, mockPluginFileName);

    switch (pluginType) {
      case 'class':
        content = `
          const { defaultHandlerPath, markdownUtilsPath, pdfGeneratorPath } = require('@paths');
          class MockClassPlugin {
            constructor(coreUtils) {
              this.coreUtils = coreUtils;
            }
            async generate(data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, pluginBasePath) {
              const result = ${JSON.stringify(expectedResult || {})};
              // Always attach the received utils for potential validation in the assert function
              result.coreUtilsReceived = this.coreUtils;
              return result;
            }
          }
          module.exports = MockClassPlugin;
        `;
        break;
      case 'object':
        content = `
          module.exports = {
            async generate(data, pluginSpecificConfig, mainConfig, outputDir, outputFilenameOpt, pluginBasePath) {
              return ${JSON.stringify(expectedResult || { success: true })};
            }
          };
        `;
        break;
      case 'throwing':
        content = `
          class MockThrowingPlugin {
            async generate() { throw new Error('Simulated error from plugin'); }
          }
          module.exports = MockThrowingPlugin;
        `;
        break;
      case 'function':
        content = 'module.exports = function() {};';
        break;
      case 'object-no-generate':
        content = "module.exports = { someProp: 'value' };";
        break;
      case 'class-no-generate':
        content =
          'class MockClassNoGenerate { constructor() {} } module.exports = MockClassNoGenerate;';
        break;
    }

    if (content) {
      fs.writeFileSync(mockPluginFilePath, content.trim());
      mocks.handlerScriptPath = mockPluginFilePath;
    }
  };

  const assert = async (result, _mocks, _constants, expect, logs) => {
    if (isNegativeTest) return;

    if (expectedError) {
      expect(result).to.be.null;
      const errorLog = logs.find((log) => log.level === 'error');
      expect(errorLog, 'Expected an error log').to.not.be.undefined;
      expect(errorLog.msg).to.include(expectedError);
    } else if (expectedLog) {
      const logEntry = logs.find((log) => log.level === 'warn');
      expect(logEntry, 'Expected a log entry').to.not.be.undefined;
      if (typeof expectedLog === 'string') {
        expect(logEntry.msg).to.equal(expectedLog);
      } else {
        expect(logEntry.msg).to.match(expectedLog);
      }
    }

    if (expectedResult) {
      if (expectedResult.coreUtilsReceived) {
        expect(result.success).to.be.true;
        expect(result.coreUtilsReceived).to.be.an('object');
        expect(result.coreUtilsReceived).to.have.keys([
          'DefaultHandler',
          'markdownUtils',
          'pdfGenerator',
        ]);
      } else {
        // Remove the coreUtilsReceived from the actual result before comparison if it wasn't expected
        delete result.coreUtilsReceived;
        expect(result).to.deep.equal(expectedResult);
      }
    }
  };

  return {
    description,
    setup,
    assert,
    isNegativeTest,
    expectedErrorMessage,
    effectiveConfig,
    data,
    outputDir,
    outputFilenameOpt,
    pluginType,
    expectedResult,
  };
}

module.exports = { makePluginManagerScenario };
