// test/integration/core/default-handler.test.2.2.15.js

const DefaultHandler = require('../../../src/core/default_handler');
const path = require('path');

describe('DefaultHandler (L2Y2) - Scenario 2.2.15: Omit Title Heading', function() {
    let defaultHandler;

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Common stubs for a successful run
        this.existsSyncStub.returns(true);
        this.readFileStub.resolves(`---\ntitle: Omit Test\n---\nContent`);
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
            omit_title_heading: true // The key flag for this test
        };

        await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

        // Assert that ensureAndPreprocessHeading was NOT called
        expect(this.ensureAndPreprocessHeadingStub.notCalled).to.be.true;

        // Also assert that the original content was passed to the renderer
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        const markdownToRender = this.renderMarkdownToHtmlStub.getCall(0).args[0];
        expect(markdownToRender).to.equal('Content');
    });

    it('should inject H1 title if omit_title_heading is false or undefined', async function() {
        // Configure ensureAndPreprocessHeadingStub to have a distinct return value for this test
        this.ensureAndPreprocessHeadingStub.returns('# Omit Test\n\nContent');

        const data = { markdownFilePath: '/path/to/test.md' };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            omit_title_heading: false // Explicitly false
        };

        await this.defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

        // Assert that ensureAndPreprocessHeading WAS called
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;

        // Assert that the modified content was passed to the renderer
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        const markdownToRender = this.renderMarkdownToHtmlStub.getCall(0).args[0];
        expect(markdownToRender).to.equal('# Omit Test\n\nContent');
    });
});
