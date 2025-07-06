// test/integration/core/default-handler.test.2.2.16.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.16: Error Handling (Critical Step Failure)', function() {
  let defaultHandler;
  const markdownFilePath = '/path/to/non-existent.md';
  const outputDir = '/path/to/output';
  const pluginBasePath = '/mock/plugin';

  beforeEach(function() {
    defaultHandler = this.defaultHandler;

    // Stub console.error to catch log messages
    this.consoleErrorStub = this.sandbox.stub(console, 'error');

    // Configure default stubs for a normal flow up to the point of failure
    this.existsSyncStub.returns(true); // Assume file exists initially for specific failure points
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: { title: 'Test' }, content: 'Content' });
    this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Test' }, processedContent: 'Content' });
    this.removeShortcodesStub.returns('Content');
    this.ensureAndPreprocessHeadingStub.returns('# Test\nContent');
    this.renderMarkdownToHtmlStub.returns('<h1>Test</h1><p>Content</p>');
    this.generateSlugStub.returns('test-document');
    this.getMathCssContentStub.resolves([]);
    this.readFileStub.withArgs(sinon.match.string, 'utf8').resolves('mock css content'); // For any CSS files
  });

  // Test Case 1: fs.readFile fails
  it('should return null and log an error if fs.readFile fails', async function() {
    // Specifically make readFile throw an error
    this.readFileStub.withArgs(markdownFilePath, 'utf8').rejects(new Error('Mock file read error during test'));
    this.existsSyncStub.withArgs(markdownFilePath).returns(true); // Ensure it's found but fails to read

    // Call the method under test and expect a null result
    const result = await defaultHandler.generate(
      { markdownFilePath: markdownFilePath },
      { inject_fm_title_as_h1: true, css_files: [], math: { enabled: false } },
      {}, outputDir, null, pluginBasePath
    );

    // Assertions:
    expect(result).to.be.null;

    // Assert that the error was logged to console.error
    expect(this.consoleErrorStub.calledOnce).to.be.true;
    expect(this.consoleErrorStub.getCall(0).args[0]).to.match(new RegExp('Error during document generation: Mock file read error during test'));

    // Ensure that generatePdf was NOT called since an earlier step failed
    expect(this.generatePdfStub.notCalled).to.be.true;
  });

  // Test Case 2: renderMarkdownToHtml fails
  it('should return null and log an error if renderMarkdownToHtml fails', async function() {
    // Assume file read succeeds but rendering fails
    this.readFileStub.withArgs(markdownFilePath, 'utf8').resolves('Valid Markdown');
    this.renderMarkdownToHtmlStub.throws(new Error('Mock HTML rendering error during test'));

    const result = await defaultHandler.generate(
      { markdownFilePath: markdownFilePath },
      { inject_fm_title_as_h1: true, css_files: [], math: { enabled: false } },
      {}, outputDir, null, pluginBasePath
    );

    expect(result).to.be.null;
    expect(this.consoleErrorStub.calledOnce).to.be.true;
    expect(this.consoleErrorStub.getCall(0).args[0]).to.match(new RegExp('Error during document generation: Mock HTML rendering error during test'));
    expect(this.generatePdfStub.notCalled).to.be.true;
  });

  // Test Case 3: generatePdf fails
  it('should return null and log an error if generatePdf fails', async function() {
    // Assume all prior steps succeed but PDF generation fails
    this.readFileStub.withArgs(markdownFilePath, 'utf8').resolves('Valid Markdown');
    this.generatePdfStub.rejects(new Error('Mock PDF generation error during test'));

    const result = await defaultHandler.generate(
      { markdownFilePath: markdownFilePath },
      { inject_fm_title_as_h1: true, css_files: [], math: { enabled: false } },
      {}, outputDir, null, pluginBasePath
    );

    expect(result).to.be.null;
    expect(this.consoleErrorStub.calledOnce).to.be.true;
    expect(this.consoleErrorStub.getCall(0).args[0]).to.match(new RegExp('Error during document generation: Mock PDF generation error during test'));
    expect(this.generatePdfStub.calledOnce).to.be.true; // generatePdf should have been called before failing
  });
});
