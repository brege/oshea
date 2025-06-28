// test/integration/core/default-handler.test.2.2.2.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../../src/core/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.2: Shortcode Removal', function() {
    let defaultHandler;
    const markdownWithShortcodes = `---\ntitle: Document with Shortcodes\n---\nThis is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}\n\nfinal paragraph.`;
    // Expected content after shortcode removal
    const cleanedMarkdownContentExpected = `This is some content with a  inline shortcode and a\n\n\n\nfinal paragraph.`; // This is the expected *body content* after FM and shortcodes are removed
    
    // Patterns for shortcode removal
    const combinedShortcodePatterns = [
        '\\{\\{<\\s*[^>]*>\\}\\}', // Matches {{< ... >}} inline shortcodes
        '\\{\\{%\\s*[^%]*%\\}\\}', // Matches individual {{% ... %}} tags (less specific)
        '\\{\\{%\\s*[^%]*%\\}\\}([\\s\\S]*?)\\{\\{%\\s*\\/[^%]*%\\}\\}' // Matches {{% ... %}} ... {{% /... %}} blocks
    ];

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs
        this.existsSyncStub.withArgs('/path/to/shortcodes.md').returns(true);
        this.readFileStub.withArgs('/path/to/shortcodes.md', 'utf8').resolves(markdownWithShortcodes);
        this.mkdirStub.resolves();

        // Configure markdown_utils stubs.
        this.extractFrontMatterStub.returns({
            data: { title: 'Document with Shortcodes' },
            content: `This is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.`
        });
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Document with Shortcodes', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' },
            processedContent: `This is some content with a {{< customShortcode param="value" >}} inline shortcode and a\n\n{{% blockShortcode %}}\nBlock content here\n{{% /blockShortcode %}}\n\nfinal paragraph.`
        });
        
        // Ensure removeShortcodesStub calls the real function from markdown_utils
        this.removeShortcodesStub.callThrough(); 
        this.generateSlugStub.callThrough(); // Ensure generateSlug also calls through for filename generation

        // Stubs for functions called after shortcode removal, ensuring they process the expected content.
        this.ensureAndPreprocessHeadingStub.callsFake((content, title, aggressive) => {
            return `# ${title}\n\n${content}`;
        });

        this.renderMarkdownToHtmlStub.callsFake((content, toc, anchor, math, mdInstance, options, customPlugins) => {
            return `<h1>Document with Shortcodes</h1>\n<p>This is some content with a  inline shortcode and a</p>\n<p>final paragraph.</p>`;
        });

        // Configure math_integration stub
        this.getMathCssContentStub.resolves([]);

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should correctly remove shortcodes from Markdown content before rendering', async function() {
        const data = {
            markdownFilePath: '/path/to/shortcodes.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            remove_shortcodes_patterns: combinedShortcodePatterns, // Pass shortcode patterns
            css_files: [],
            math: { enabled: false } // Math is disabled for this test.
        };
        const globalConfig = {
            global_remove_shortcodes: [], // No global patterns for this test
            global_pdf_options: {}
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null;

        const expectedOutputPdfPath = path.join(outputDir, 'document-with-shortcodes.pdf');

        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt);

        // Assertions for critical function calls and their arguments
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;
        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        
        const removeShortcodesCallArgs = this.removeShortcodesStub.getCall(0).args;
        expect(removeShortcodesCallArgs[0]).to.equal(this.extractFrontMatterStub.getCall(0).returnValue.content);
        expect(removeShortcodesCallArgs[1]).to.deep.equal(combinedShortcodePatterns);
        expect(this.removeShortcodesStub.calledOnce).to.be.true;

        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        expect(this.generatePdfStub.calledOnce).to.be.true;
        
        // Detailed assertion for arguments passed to generatePdf
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        expect(actualHtmlContent).to.equal(this.renderMarkdownToHtmlStub.getCall(0).returnValue);
        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);
        expect(actualPdfOptions).to.deep.equal({ margin: {} }); // This reflects the actual output of `default_handler.js`
        expect(actualCssContentArray).to.deep.equal([]);

        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
