// test/integration/core/default-handler.test.2.2.15.js
describe('DefaultHandler (L2Y2) - Scenario 2.2.15: Omit Title Heading', function() {
  beforeEach(function() {
    // Common stubs for a successful run
    this.existsSyncStub.returns(true);
    this.readFileStub.resolves('---\ntitle: Omit Test\n---\nContent');
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: { title: 'Omit Test' }, content: 'Content' });
    this.substituteAllPlaceholdersStub.returns({
      processedFmData: { title: 'Omit Test' },
      processedContent: 'Content'
    });
    this.removeShortcodesStub.returns('Content');
    this.renderMarkdownToHtmlStub.returns('<p>Content</p>');
    this.getMathCssContentStub.resolves([]);
    this.generatePdfStub.resolves();
    this.generateSlugStub.returns('omit-test');
  });

  it('should NOT inject H1 title if omit_title_heading is true', async function() {
    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {
      inject_fm_title_as_h1: true,
      omit_title_heading: true
    };

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.ensureAndPreprocessHeadingStub.notCalled).to.be.true;
    expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
    const markdownToRender = this.renderMarkdownToHtmlStub.getCall(0).args[0];
    expect(markdownToRender).to.equal('Content');
  });

  it('should inject H1 title if omit_title_heading is false or undefined', async function() {
    this.ensureAndPreprocessHeadingStub.returns('# Omit Test\n\nContent');

    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {
      inject_fm_title_as_h1: true,
      omit_title_heading: false
    };

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
    expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
    const markdownToRender = this.renderMarkdownToHtmlStub.getCall(0).args[0];
    expect(markdownToRender).to.equal('# Omit Test\n\nContent');
  });
});
