// test/integration/core/default-handler.factory.js
const path = require('path'); // Ensure path is required for path.resolve

function makeDefaultHandlerScenario({
  description,
  markdownFilePath = '/path/to/test.md',
  markdownContent,
  pluginSpecificConfig = {},
  globalConfig = {},
  outputDir = '/output',
  outputFilenameOpt = null,
  pluginBasePath = '/plugins/test',
  stubs = {},
  expectedResult,
  expectedError,
  expectedLogs = [],
}) {
  const setup = (DefaultHandler, mockStubs) => {
    // File system stubs
    if (stubs.existsSync !== false) {
      mockStubs.existsSyncStub.withArgs(markdownFilePath).returns(true);
    } else {
      mockStubs.existsSyncStub.withArgs(markdownFilePath).returns(false);
    }

    if (stubs.readFileThrows) {
      mockStubs.readFileStub.withArgs(markdownFilePath, 'utf8').rejects(new Error(expectedError));
    } else {
      mockStubs.readFileStub.withArgs(markdownFilePath, 'utf8').resolves(markdownContent);
    }

    mockStubs.mkdirStub.resolves();


    if (stubs.fileMocks && Array.isArray(stubs.fileMocks)) {
      stubs.fileMocks.forEach(fileMock => {
        const mockPath = path.resolve(fileMock.path);
        mockStubs.existsSyncStub.withArgs(mockPath).returns(true);
        mockStubs.readFileStub.withArgs(mockPath, 'utf8').resolves(fileMock.content);
      });
    }


    // markdown_utils stubs
    mockStubs.extractFrontMatterStub.returns(stubs.extractFrontMatter || { data: {}, content: '' });
    mockStubs.substituteAllPlaceholdersStub.returns(stubs.substituteAllPlaceholders || { processedFmData: {}, processedContent: '' });
    mockStubs.removeShortcodesStub.returns(stubs.removeShortcodes || '');
    mockStubs.ensureAndPreprocessHeadingStub.returns(stubs.ensureAndPreprocessHeading || '');

    if (stubs.renderMarkdownToHtmlThrows) {
      mockStubs.renderMarkdownToHtmlStub.throws(new Error(expectedError));
    } else {
      mockStubs.renderMarkdownToHtmlStub.returns(stubs.renderMarkdownToHtml || '');
    }

    if (stubs.generateSlug) {
      Object.entries(stubs.generateSlug).forEach(([input, output]) => {
        mockStubs.generateSlugStub.withArgs(input).returns(output);
      });
    } else {
      mockStubs.generateSlugStub.returns('test-slug');
    }

    // math_integration stubs
    mockStubs.getMathCssContentStub.resolves(stubs.getMathCssContent || []);

    // pdf_generator stubs
    if (stubs.generatePdfThrows) {
      mockStubs.generatePdfStub.rejects(new Error(expectedError));
    } else {
      mockStubs.generatePdfStub.resolves(expectedResult);
    }
  };

  const assert = (result, mockStubs, expect, logs) => {
    if (expectedError) {
      expect(result).to.be.null;
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog, 'Expected an error log').to.not.be.undefined;
      expect(errorLog.msg).to.equal('Document generation failed');
      expect(errorLog.data.error).to.include(expectedError);
      expect(errorLog.data.context).to.equal('DefaultHandler');
    } else {
      expect(result).to.equal(expectedResult);
    }

    if (expectedLogs.length > 0) {
      expect(logs.length).to.equal(expectedLogs.length, 'Number of captured logs must match expected number');
      logs.forEach((log, i) => {
        if (expectedLogs[i]) {
          expect(log.level).to.equal(expectedLogs[i].level, `Log ${i}: Level mismatch`);
          expect(log.msg).to.equal(expectedLogs[i].msg, `Log ${i}: Message mismatch`);
          if (expectedLogs[i].data) {
            expect(log.data).to.deep.include(expectedLogs[i].data, `Log ${i}: Data mismatch`);
          } else {
            expect(log.data).to.be.null;
          }
        }
      });
    }

    if (stubs.expectations) {
      stubs.expectations(mockStubs, expect);
    }
  };

  return {
    description,
    setup,
    assert,
    data: { markdownFilePath },
    pluginSpecificConfig,
    globalConfig,
    outputDir,
    outputFilenameOpt,
    pluginBasePath,
  };
}

module.exports = { makeDefaultHandlerScenario };
