// test/integration/core/default-handler.test.2.2.14.js
describe('DefaultHandler (L2Y2) - Scenario 2.2.14: lang Attribute Handling', function() {
  beforeEach(function() {
    // Configure common stubs for a successful run
    this.existsSyncStub.returns(true);
    this.readFileStub.resolves('---\ntitle: Lang Test\nlang: fr\n---\nContent');
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: {}, content: 'Content' });
    this.substituteAllPlaceholdersStub.returns({
      processedFmData: { title: 'Lang Test', lang: 'fr' },
      processedContent: 'Content'
    });
    this.removeShortcodesStub.returns('Content');
    this.ensureAndPreprocessHeadingStub.returns('# Lang Test\n\nContent');
    this.renderMarkdownToHtmlStub.returns('<p>Content</p>');
    this.getMathCssContentStub.resolves([]);
    this.generatePdfStub.resolves();
    this.generateSlugStub.returns('lang-test');
  });

  it('should pass the lang attribute from front matter to the pdf_generator', async function() {
    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {};

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.generatePdfStub.calledOnce).to.be.true;

    const injectionPoints = this.generatePdfStub.lastCall.args[5];

    expect(injectionPoints).to.be.an('object');
    expect(injectionPoints.lang).to.equal('fr');
  });

  it('should default to "en" if lang is not specified in front matter', async function() {
    this.substituteAllPlaceholdersStub.returns({
      processedFmData: { title: 'Lang Test' },
      processedContent: 'Content'
    });

    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {};

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

    expect(this.generatePdfStub.calledOnce).to.be.true;
    const injectionPoints = this.generatePdfStub.lastCall.args[5];

    expect(injectionPoints).to.be.an('object');
    expect(injectionPoints.lang).to.equal('en');
  });
});
