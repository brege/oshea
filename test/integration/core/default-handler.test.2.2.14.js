// test/integration/core/default-handler.test.2.2.14.js

const DefaultHandler = require('../../../src/core/default_handler');
const path = require('path');

describe('DefaultHandler (L2Y2) - Scenario 2.2.14: lang Attribute Handling', function() {
    let defaultHandler;

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure common stubs for a successful run
        this.existsSyncStub.returns(true);
        this.readFileStub.resolves(`---\ntitle: Lang Test\nlang: fr\n---\nContent`);
        this.mkdirStub.resolves();
        
        // ADDED: Stub for extractFrontMatter to prevent TypeError.
        // Its output is not critical as substituteAllPlaceholdersStub is the true source of data for this test.
        this.extractFrontMatterStub.returns({ data: {}, content: 'Content' });

        // This is the source of the `lang` attribute, so we stub its output
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

        const injectionPoints = this.generatePdfStub.lastCall.args[5]; // The injectionPoints object is the 6th argument

        expect(injectionPoints).to.be.an('object');
        expect(injectionPoints.lang).to.equal('fr');
    });

    it('should default to "en" if lang is not specified in front matter', async function() {
        // Override the stub for this specific test case
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Lang Test' }, // No lang property
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
