// test/integration/core/default-handler.test.2.2.11.js
describe('DefaultHandler (L2Y2) - Scenario 2.2.11: Output Filename Determination', function() {
  const markdownContent = '---\ntitle: My Awesome Document\nauthor: John Doe\ndate: 2023-10-26\n---\nContent here.';
  const expectedHtml = '<h1>My Awesome Document</h1><p>Content here.</p>';

  beforeEach(function() {
    // Configure file system stubs for markdown file
    this.existsSyncStub.withArgs('/path/to/my-document.md').returns(true);
    this.readFileStub.withArgs('/path/to/my-document.md', 'utf8').resolves(markdownContent);
    this.mkdirStub.resolves();

    // Configure markdown_utils stubs for content processing and filename derivation
    this.extractFrontMatterStub.returns({
      data: { title: 'My Awesome Document', author: 'John Doe', date: '2023-10-26' },
      content: 'Content here.'
    });
    this.substituteAllPlaceholdersStub.returns({
      processedFmData: { title: 'My Awesome Document', author: 'John Doe', date: '2023-10-26', CurrentDateISO: '2023-10-26' },
      processedContent: 'Content here.'
    });
    this.removeShortcodesStub.returns('Content here.');
    this.ensureAndPreprocessHeadingStub
      .withArgs('Content here.', 'My Awesome Document', false)
      .returns('# My Awesome Document\n\nContent here.');

    this.renderMarkdownToHtmlStub.returns(expectedHtml);

    this.generateSlugStub.withArgs('My Awesome Document').returns('my-awesome-document');
    this.generateSlugStub.withArgs('John Doe').returns('john-doe');
    this.generateSlugStub.withArgs('my-document').returns('my-document');

    this.getMathCssContentStub.resolves([]);
    this.readFileStub.withArgs(sinon.match.any, 'utf8').resolves('');

    this.generatePdfStub.resolves();
  });

  it('should correctly determine the output filename based on front matter (title, author, date)', async function() {
    const data = {
      markdownFilePath: '/path/to/my-document.md'
    };
    const pluginSpecificConfig = {
      inject_fm_title_as_h1: true,
      css_files: [],
      math: { enabled: false },
      toc_options: { enabled: false },
      pdf_options: {}
    };
    const globalConfig = {
      global_remove_shortcodes: [],
      global_pdf_options: {}
    };
    const outputDir = '/path/to/output';
    const outputFilenameOpt = null;

    const expectedDerivedFilename = 'my-awesome-document-john-doe-2023-10-26.pdf';
    const expectedOutputPdfPath = path.join(outputDir, expectedDerivedFilename);

    const resultPath = await this.defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, '/some/plugin/base/path');

    expect(this.generatePdfStub.calledOnce).to.be.true;
    const [
      actualHtmlContent,
      actualOutputPdfPath
    ] = this.generatePdfStub.getCall(0).args;

    expect(actualHtmlContent).to.equal(expectedHtml);
    expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);

    expect(resultPath).to.equal(expectedOutputPdfPath);

    expect(this.generateSlugStub.calledWith('My Awesome Document')).to.be.true;
    expect(this.generateSlugStub.calledWith('John Doe')).to.be.true;
  });
});
