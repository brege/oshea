// test/integration/core/default-handler.test.2.2.6.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../../src/core/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.6: MarkdownIt Plugins (Anchor & TOC)', function() {
    let defaultHandler;
    const markdownContentWithHeadings = `---\ntitle: Document with TOC & Anchors\n---\n# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`;
    // Simplified HTML representation after TOC and anchor processing (exact content not verified, just arguments passed)
    const expectedRenderedHtml = `<h1>Main Heading</h1><h2>Section One</h2><h3>Subsection A</h3><h2>Section Two</h2><p>Here is a TOC:</p>\n<ul><li><a href="#section-one">Section One</a></li><li><a href="#subsection-a">Subsection A</a></li><li><a href="#section-two">Section Two</a></li></ul>`; 

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs
        this.existsSyncStub.withArgs('/path/to/doc.md').returns(true);
        this.readFileStub.withArgs('/path/to/doc.md', 'utf8').resolves(markdownContentWithHeadings);
        this.mkdirStub.resolves();

        // Configure markdown_utils stubs
        this.extractFrontMatterStub.returns({
            data: { title: 'Document with TOC & Anchors' },
            content: `# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`
        });
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Document with TOC & Anchors', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' },
            processedContent: `# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`
        });
        this.removeShortcodesStub.returns(`# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`);
        this.ensureAndPreprocessHeadingStub
            .withArgs(`# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`, 'Document with TOC & Anchors', false)
            .returns(`# Document with TOC & Anchors\n\n# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`);
        
        // This is the key stub for this test: verify arguments passed to it
        this.renderMarkdownToHtmlStub.returns(expectedRenderedHtml);

        // CONFIGURE generateSlug STUB for filename generation
        this.generateSlugStub.withArgs('Document with TOC & Anchors').returns('document-with-toc-and-anchors');
        this.generateSlugStub.withArgs('doc').returns('doc');

        // Configure math_integration stub (not enabled for this scenario, so should not be called)
        this.getMathCssContentStub.resolves([]); // Still resolve, but expect notCalled

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should correctly apply markdown-it-anchor and markdown-it-table-of-contents options', async function() {
        const data = {
            markdownFilePath: '/path/to/doc.md'
        };
        const tocOptions = { enabled: true, placeholder: '{{toc}}', level: [1, 2, 3] };
        const anchorOptions = { permalink: true, level: [1, 2, 3] }; // Example anchor options
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            css_files: [],
            math: { enabled: false }, // Math is explicitly disabled for this test
            toc_options: tocOptions, // TOC options directly from plugin config
            pdf_options: { // pdf_options is where anchor_options would be nested in config
                anchor_options: anchorOptions
            }
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: {} // Empty global_pdf_options
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null;

        const expectedOutputPdfPath = path.join(outputDir, 'document-with-toc-and-anchors.pdf');

        // Call the method under test
        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt);

        // Assertions for core file system operations
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;

        // Assertions for markdown processing pipeline steps
        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        expect(this.removeShortcodesStub.calledOnce).to.be.true;
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        
        // Assert that renderMarkdownToHtml was called with the correct TOC and Anchor options
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        const [
            actualMarkdownToRender,
            actualTocOptions,
            actualAnchorOptions, // This will be the mergedPdfOptions.anchor_options
            actualMathConfig
        ] = this.renderMarkdownToHtmlStub.getCall(0).args;

        expect(actualMarkdownToRender).to.equal(`# Document with TOC & Anchors\n\n# Main Heading\n\n## Section One\n\n### Subsection A\n\n## Section Two\n\n{{toc}}`);
        expect(actualTocOptions).to.deep.equal(tocOptions);
        expect(actualAnchorOptions).to.deep.equal(anchorOptions);
        expect(actualMathConfig).to.deep.equal({ enabled: false }); // Math was disabled

        // Assert that getMathCssContent was NOT called because math is disabled
        expect(this.getMathCssContentStub.notCalled).to.be.true; 

        // Assertions for PDF generation
        expect(this.generatePdfStub.calledOnce).to.be.true;
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        expect(actualHtmlContent).to.equal(expectedRenderedHtml);
        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);
        expect(actualPdfOptions).to.deep.equal({ anchor_options: anchorOptions, margin: {} }); 
        expect(actualCssContentArray).to.deep.equal([]); // No CSS files configured for this test

        // Verify the function returns the correct output path
        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
