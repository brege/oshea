// test/integration/core/default-handler.test.2.2.4.js
describe('DefaultHandler (L2Y2) - Scenario 2.2.4: Markdown-It Options Application', function() {
  beforeEach(function() {
    // Configure common stubs for a successful run
    this.existsSyncStub.returns(true);
    this.readFileStub.resolves('---\ntitle: MDIT Options Test\n---\nline1\nline2');
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: { title: 'MDIT Options Test' }, content: 'line1\nline2' });
    this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'MDIT Options Test' }, processedContent: 'line1\nline2' });
    this.removeShortcodesStub.returns('line1\nline2');
    this.ensureAndPreprocessHeadingStub.returns('# MDIT Options Test\n\nline1\nline2');
    this.renderMarkdownToHtmlStub.returns('<p>dummy html</p>');
    this.getMathCssContentStub.resolves([]);
    this.generatePdfStub.resolves();
    this.generateSlugStub.returns('mdit-options-test');
  });

  it('should apply markdown_it_options from plugin config to the MarkdownIt instance', async function() {
    const markdownItOptions = {
      breaks: true,
      linkify: false
    };

    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {
      inject_fm_title_as_h1: true,
      markdown_it_options: markdownItOptions
    };

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;

    const [
      , , , , mdInstance, actualMarkdownItOptions
    ] = this.renderMarkdownToHtmlStub.getCall(0).args;

    expect(mdInstance).to.be.null;
    expect(actualMarkdownItOptions).to.deep.equal(markdownItOptions);
  });
});
