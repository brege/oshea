// test/default-handler/default-handler.test.2.2.2.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../src/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.2: Shortcode Removal', function() {
    let defaultHandler;
    const markdownWithShortcodes = `---\ntitle: Document with Shortcodes\n---\nThis is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.`;
    const cleanedMarkdownContent = `This is some content with a  inline shortcode and a\n\n\n\nfinal paragraph.`; // Expected content after shortcode removal
    const combinedShortcodePatterns = [
        '\\{\\{<\\s*[^>]*>\\}\\}', // Matches {{< ... >}}
        '\\{\\{%\\s*[^%]*%\\}\\}', // Matches {{% ... %}}
        '\\{\\{%\\s*[^%]*%\\}\\}\\s*([\\s\\S]*?)\\s*\\{\\{%\\s*\\/[^%]*%\\}\\}' // Matches {{% ... %}} ... {{% /... %}} blocks
    ];

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs
        this.existsSyncStub.withArgs('/path/to/shortcodes.md').returns(true);
        this.readFileStub.withArgs('/path/to/shortcodes.md', 'utf8').resolves(markdownWithShortcodes);
        this.mkdirStub.resolves();

        // Configure markdown_utils stubs
        this.extractFrontMatterStub.returns({
            data: { title: 'Document with Shortcodes' },
            content: 'This is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.'
        });
        // For this scenario, assume placeholder substitution doesn't affect shortcodes
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Document with Shortcodes', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' },
            processedContent: 'This is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.'
        });
        // This is the core stub for this test: it simulates shortcode removal
        this.removeShortcodesStub.returns(cleanedMarkdownContent);
        this.ensureAndPreprocessHeadingStub
            .withArgs(cleanedMarkdownContent, 'Document with Shortcodes', false)
            .returns('# Document with Shortcodes\n\n' + cleanedMarkdownContent);
        this.renderMarkdownToHtmlStub
            .withArgs('# Document with Shortcodes\n\n' + cleanedMarkdownContent,
                { enabled: false }, // toc_options
                {}, // anchor_options
                { enabled: false } // math config
            )
            .returns('<h1>Document with Shortcodes</h1><p>This is some content with a  inline shortcode and a</p>\n<p>final paragraph.</p>');

        // Configure math_integration stub
        this.getMathCssContentStub.resolves([]);

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it.skip('should correctly remove shortcodes from Markdown content before rendering', async function() {
        const data = {
            markdownFilePath: '/path/to/shortcodes.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            remove_shortcodes_patterns: combinedShortcodePatterns, // Pass shortcode patterns
            css_files: [],
            math: { enabled: false }
        };
        const globalConfig = {
            global_remove_shortcodes: [], // No global patterns for this test
            global_pdf_options: {}
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null;

        const expectedOutputPdfPath = path.join(outputDir, 'document-with-shortcodes.pdf');

        // Call the method under test
        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt);

        // Assertions
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;

        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        // Crucial assertion for this test: check if removeShortcodes was called with the correct content and patterns
        expect(this.removeShortcodesStub.calledWith(
            'This is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.',
            combinedShortcodePatterns
        )).to.be.true;
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        expect(this.getMathCssContentStub.calledOnce).to.be.true;

        expect(this.generatePdfStub.calledOnce).to.be.true;
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        // Verify that the HTML passed to generatePdf reflects the removed shortcodes
        expect(actualHtmlContent).to.equal('<h1>Document with Shortcodes</h1><p>This is some content with a  inline shortcode and a</p>\n<p>final paragraph.</p>');
        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);
        expect(actualPdfOptions).to.deep.equal({});
        expect(actualCssContentArray).to.deep.equal([]);

        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
