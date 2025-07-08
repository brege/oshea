// test/integration/plugins/plugin_determiner.factory.js

function setupTestFiles(mocks, constants, fileContents = {}, parsedContents = {}) {
  const { mockFsPromises, mockFsSync, mockMarkdownUtils, mockYaml } = mocks;
  const { DUMMY_MARKDOWN_FILE_PATH, DUMMY_LOCAL_CONFIG_FILE_PATH } = constants;

  if (fileContents.markdown !== undefined) {
    mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE_PATH).returns(true);
    mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE_PATH, 'utf8').resolves(fileContents.markdown);
    if (parsedContents.fmData !== undefined) {
      mockMarkdownUtils.extractFrontMatter.withArgs(fileContents.markdown).returns({
        data: parsedContents.fmData,
        content: parsedContents.markdownContent || ''
      });
    }
  } else {
    mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE_PATH).returns(false);
  }

  if (fileContents.localConfig !== undefined) {
    mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE_PATH).returns(true);
    mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE_PATH, 'utf8').resolves(fileContents.localConfig);
    if (parsedContents.parsedLocalConfig !== undefined) {
      mockYaml.load.returns(parsedContents.parsedLocalConfig);
    }
  } else {
    mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE_PATH).returns(false);
  }
}

function assertCommonFileAndParsingInteractions(mocks, constants, args, markdownFileExpectedToBeProcessed, localConfigFileExpectedToBeProcessed) {
  const { mockFsSync, mockFsPromises, mockMarkdownUtils, mockYaml } = mocks;
  const { DUMMY_MARKDOWN_FILE_PATH, DUMMY_LOCAL_CONFIG_FILE_PATH } = constants;

  if (args.markdownFile) {
    expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE_PATH)).to.be.true;
    expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE_PATH)).to.be.true;

    if (markdownFileExpectedToBeProcessed) {
      expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE_PATH, 'utf8')).to.be.true;
      expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
    } else {
      expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE_PATH, 'utf8')).to.be.false;
      expect(mockMarkdownUtils.extractFrontMatter.called).to.be.false;
    }

    if (localConfigFileExpectedToBeProcessed) {
      expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE_PATH, 'utf8')).to.be.true;
      expect(mockYaml.load.calledOnce).to.be.true;
    } else {
      expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE_PATH, 'utf8')).to.be.false;
      expect(mockYaml.load.called).to.be.false;
    }
  } else {
    expect(mockFsSync.existsSync.called).to.be.false;
    expect(mockFsPromises.readFile.called).to.be.false;
    expect(mockMarkdownUtils.extractFrontMatter.called).to.be.false;
    expect(mockYaml.load.called).to.be.false;
  }
}

module.exports = {
  setupTestFiles,
  assertCommonFileAndParsingInteractions
};
