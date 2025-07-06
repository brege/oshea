// test/integration/core/default-handler.test.2.2.7.js
describe('DefaultHandler (L2Y2) - Scenario 2.2.7: Custom Markdown-It Plugins', function() {
  beforeEach(function() {
    // Configure common stubs for a successful run
    this.existsSyncStub.returns(true);
    this.readFileStub.resolves('---\ntitle: Custom Plugin Test\n---\nSome content.');
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: { title: 'Custom Plugin Test' }, content: 'Some content.' });
    this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Custom Plugin Test' }, processedContent: 'Some content.' });
    this.removeShortcodesStub.returns('Some content.');
    this.ensureAndPreprocessHeadingStub.returns('# Custom Plugin Test\n\nSome content.');
    this.renderMarkdownToHtmlStub.returns('<p>dummy html</p>');
    this.getMathCssContentStub.resolves([]);
    this.generatePdfStub.resolves();
    this.generateSlugStub.returns('custom-plugin-test');
  });

  it('should correctly integrate custom MarkdownIt plugins from config', async function() {
    const customPlugins = [
      'markdown-it-footnote',
      ['markdown-it-emoji', { shortcuts: {} }]
    ];

    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {
      inject_fm_title_as_h1: true,
      markdown_it_plugins: customPlugins
    };

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;

    const [
      , , , , , markdownItOptions, actualCustomPlugins
    ] = this.renderMarkdownToHtmlStub.getCall(0).args;

    expect(markdownItOptions).to.be.undefined;
    expect(actualCustomPlugins).to.deep.equal(customPlugins);
  });
});
