// test/integration/core/default-handler.test.2.2.7.js

const DefaultHandler = require('../../../src/core/default_handler');
const path = require('path');

describe('DefaultHandler (L2Y2) - Scenario 2.2.7: Custom Markdown-It Plugins', function() {
    let defaultHandler;

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure common stubs for a successful run
        this.existsSyncStub.returns(true);
        this.readFileStub.resolves('---\ntitle: Custom Plugin Test\n---\nSome content.');
        this.mkdirStub.resolves();
        this.extractFrontMatterStub.returns({ data: { title: 'Custom Plugin Test' }, content: 'Some content.' });
        this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Custom Plugin Test' }, processedContent: 'Some content.' });
        this.removeShortcodesStub.returns('Some content.');
        this.ensureAndPreprocessHeadingStub.returns('# Custom Plugin Test\n\nSome content.');
        
        // Stub the target function to check its arguments
        this.renderMarkdownToHtmlStub.returns('<p>dummy html</p>');

        this.getMathCssContentStub.resolves([]);
        this.generatePdfStub.resolves();
        this.generateSlugStub.returns('custom-plugin-test');
    });

    it('should correctly integrate custom MarkdownIt plugins from config', async function() {
        // Define the plugin configuration as it would appear in the config file.
        const customPlugins = [
            'markdown-it-footnote',
            ['markdown-it-emoji', { shortcuts: {} }]
        ];

        const data = { markdownFilePath: '/path/to/test.md' };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            markdown_it_plugins: customPlugins
        };
        
        // Execute the handler
        await defaultHandler.generate(data, pluginSpecificConfig, {}, '/output', null);

        // Assert that renderMarkdownToHtml was called
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;

        // Get the arguments it was called with
        const [
            content,
            tocOptions,
            anchorOptions,
            mathConfig,
            mdInstance,
            markdownItOptions,
            actualCustomPlugins
        ] = this.renderMarkdownToHtmlStub.getCall(0).args;

        // Verify the plugin array was passed correctly
        expect(markdownItOptions).to.be.undefined;
        expect(actualCustomPlugins).to.deep.equal(customPlugins);
    });
});
