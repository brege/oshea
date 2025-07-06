// test/integration/core/default-handler.test.2.2.9.js
const path = require('path');

describe('DefaultHandler (L2Y2) - Scenario 2.2.9: Custom HTML Template', function() {
  const pluginBasePath = '/plugins/my-plugin';
  const templatePath = path.resolve(pluginBasePath, 'my-template.html');
  const templateContent = '<!DOCTYPE html><html><head><title>Custom: {{{title}}}</title>{{{styles}}}</head><body><h1>Custom Template</h1>{{{body}}}</body></html>';

  beforeEach(function() {
    // Configure common stubs for a successful run
    this.existsSyncStub.returns(true);
    this.existsSyncStub.withArgs(templatePath).returns(true);
    this.readFileStub.withArgs(sinon.match.any, 'utf8').resolves('---\ntitle: Template Test\n---\nContent');
    this.readFileStub.withArgs(templatePath, 'utf8').resolves(templateContent);
    this.mkdirStub.resolves();
    this.extractFrontMatterStub.returns({ data: { title: 'Template Test' }, content: 'Content' });
    this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Template Test' }, processedContent: 'Content' });
    this.removeShortcodesStub.returns('Content');
    this.ensureAndPreprocessHeadingStub.returns('# Template Test\n\nContent');
    this.renderMarkdownToHtmlStub.returns('<p>Content</p>');
    this.getMathCssContentStub.resolves([]);
    this.generatePdfStub.resolves();
    this.generateSlugStub.returns('template-test');
  });

  it('should load and pass custom HTML template content to pdf_generator', async function() {
    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {
      html_template_path: 'my-template.html'
    };

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null, pluginBasePath);

    expect(this.existsSyncStub.calledWith(templatePath)).to.be.true;
    expect(this.readFileStub.calledWith(templatePath, 'utf8')).to.be.true;
    expect(this.generatePdfStub.calledOnce).to.be.true;
    const [, , , , actualTemplateContent] = this.generatePdfStub.getCall(0).args;
    expect(actualTemplateContent).to.equal(templateContent);
  });

  it('should proceed without a template if html_template_path is not provided', async function() {
    const data = { markdownFilePath: '/path/to/test.md' };
    const pluginSpecificConfig = {};

    await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null, pluginBasePath);

    expect(this.generatePdfStub.calledOnce).to.be.true;
    const [, , , , actualTemplateContent] = this.generatePdfStub.getCall(0).args;
    expect(actualTemplateContent).to.be.null;
  });
});
