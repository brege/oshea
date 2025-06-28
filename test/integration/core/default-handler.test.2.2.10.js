// test/integration/core/default-handler.test.2.2.10.js

const DefaultHandler = require('../../../src/core/default_handler');
const path = require('path');

describe('DefaultHandler (L2Y2) - Scenario 2.2.10: HTML Injection', function() {
    let defaultHandler;

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure common stubs for a successful run
        this.existsSyncStub.returns(true);
        this.readFileStub.resolves(`---\ntitle: Injection Test\n---\nContent`);
        this.mkdirStub.resolves();
        this.extractFrontMatterStub.returns({ data: { title: 'Injection Test' }, content: 'Content' });
        this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Injection Test' }, processedContent: 'Content' });
        this.removeShortcodesStub.returns('Content');
        this.ensureAndPreprocessHeadingStub.returns('# Injection Test\n\nContent');
        this.renderMarkdownToHtmlStub.returns('<p>Content</p>');
        this.getMathCssContentStub.resolves([]);
        this.generatePdfStub.resolves();
        this.generateSlugStub.returns('injection-test');
    });

    it('should pass HTML injection snippets to pdf_generator', async function() {
        const data = { markdownFilePath: '/path/to/test.md' };
        const pluginSpecificConfig = {
            head_html: '<meta name="author" content="Test">',
            body_html_start: '<header>My Header</header>',
            body_html_end: '<footer>My Footer</footer>'
        };

        await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

        expect(this.generatePdfStub.calledOnce).to.be.true;

        const lastCallArgs = this.generatePdfStub.lastCall.args;
        const injectionPoints = lastCallArgs[5]; // The injectionPoints object is the 6th argument

        expect(injectionPoints).to.be.an('object');
        expect(injectionPoints.head_html).to.equal(pluginSpecificConfig.head_html);
        expect(injectionPoints.body_html_start).to.equal(pluginSpecificConfig.body_html_start);
        expect(injectionPoints.body_html_end).to.equal(pluginSpecificConfig.body_html_end);
    });

    it('should pass empty strings for unspecified HTML injection snippets', async function() {
        const data = { markdownFilePath: '/path/to/test.md' };
        const pluginSpecificConfig = {
            // No injection points specified
        };

        await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

        expect(this.generatePdfStub.calledOnce).to.be.true;

        const injectionPoints = this.generatePdfStub.lastCall.args[5];

        expect(injectionPoints).to.be.an('object');
        expect(injectionPoints.head_html).to.equal('');
        expect(injectionPoints.body_html_start).to.equal('');
        expect(injectionPoints.body_html_end).to.equal('');
    });
});
