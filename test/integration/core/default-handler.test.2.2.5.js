// test/integration/core/default-handler.test.2.2.5.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../../src/core/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.5: Math Rendering Integration', function() {
    let defaultHandler;
    const markdownWithMath = `---\ntitle: Math Document\n---\nThis document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`;
    // The actual HTML output for math would contain complex KaTeX spans,
    // here we use a simplified representation for stubbing purposes.
    const renderedHtmlWithMath = `<h1>Math Document</h1><p>This document contains inline math <span class="katex">...</span> and block math:</p>\n<p><span class="katex">...</span></p>`; 
    const expectedMathCssContent = ['/* KaTeX CSS content from getMathCssContent stub */'];

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs
        this.existsSyncStub.withArgs('/path/to/math.md').returns(true);
        this.readFileStub.withArgs('/path/to/math.md', 'utf8').resolves(markdownWithMath);
        this.mkdirStub.resolves();

        // Configure markdown_utils stubs
        this.extractFrontMatterStub.returns({
            data: { title: 'Math Document' },
            content: `This document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`
        });
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Math Document', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' },
            processedContent: `This document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`
        });
        this.removeShortcodesStub.returns(`This document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`);
        this.ensureAndPreprocessHeadingStub
            .withArgs(`This document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`, 'Math Document', false)
            .returns('# Math Document\n\n' + `This document contains inline math $a^2 + b^2 = c^2$ and block math:\n\n$$ \\int_0^1 x^2 dx = \\frac{1}{3} $$`);
        
        // renderMarkdownToHtml will be called with the math config
        this.renderMarkdownToHtmlStub.returns(renderedHtmlWithMath);

        // CONFIGURE generateSlug STUB
        // Ensure generateSlug returns expected values for filename creation
        this.generateSlugStub.withArgs('Math Document').returns('math-document');
        this.generateSlugStub.withArgs('math').returns('math'); // Fallback for baseInputName if needed in filename logic

        // Configure math_integration stubs
        const mathConfigForStub = { enabled: true, engine: 'katex', katex_options: { throwOnError: false } };
        this.getMathCssContentStub.withArgs(mathConfigForStub).resolves(expectedMathCssContent);

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should integrate math rendering by calling math_integration.getMathCssContent when configured', async function() {
        const data = {
            markdownFilePath: '/path/to/math.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            css_files: [],
            math: { enabled: true, engine: 'katex', katex_options: { throwOnError: false } }
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: {} // Empty global_pdf_options
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null;

        const expectedOutputPdfPath = path.join(outputDir, 'math-document.pdf');

        // Call the method under test
        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt);

        // Assertions for core file system operations
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;

        // Assertions for markdown processing pipeline
        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        expect(this.removeShortcodesStub.calledOnce).to.be.true;
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        
        // Assertion for math_integration.getMathCssContent
        // This verifies that DefaultHandler correctly requests CSS when math is enabled.
        expect(this.getMathCssContentStub.calledOnce).to.be.true;
        expect(this.getMathCssContentStub.calledWith(pluginSpecificConfig.math)).to.be.true;

        // Assertions for PDF generation
        expect(this.generatePdfStub.calledOnce).to.be.true;
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        expect(actualHtmlContent).to.equal(renderedHtmlWithMath);
        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);
        
        // FIX: The default_handler.js always initializes mergedPdfOptions with a margin object,
        // even if globalConfig.global_pdf_options is empty.
        expect(actualPdfOptions).to.deep.equal({ margin: {} }); 
        expect(actualCssContentArray).to.deep.equal(expectedMathCssContent); // Ensure math CSS is passed to pdf_generator

        // Verify the function returns the correct output path
        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
