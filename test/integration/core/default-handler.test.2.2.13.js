// test/integration/core/default-handler.test.2.2.13.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../../src/core/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js
const fs = require('fs').promises; // Available globally via setup.js
const fss = require('fs'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.13: Verify generatePdf Call with Prepared Content and Options', function() {
    let defaultHandler;
    const markdownContent = `---\ntitle: Test Document\n---\nHello world.`;
    const expectedRenderedHtml = `<h1>Test Document</h1><p>Hello world.</p>`;
    const pluginBasePath = '/mock/plugin'; // A mock base path for the plugin
    const pluginCssFileName = 'styles/plugin.css';
    const pluginCssContent = '/* content of plugin.css */';

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs for markdown file
        this.existsSyncStub.withArgs('/path/to/test-doc.md').returns(true);
        this.readFileStub.withArgs('/path/to/test-doc.md', 'utf8').resolves(markdownContent);
        this.mkdirStub.resolves();

        // Stub CSS file existence and content
        this.existsSyncStub.withArgs(path.resolve(pluginBasePath, pluginCssFileName)).returns(true);
        this.readFileStub.withArgs(path.resolve(pluginBasePath, pluginCssFileName), 'utf8').resolves(pluginCssContent);

        // Configure markdown_utils stubs for content processing
        this.extractFrontMatterStub.returns({
            data: { title: 'Test Document' },
            content: 'Hello world.'
        });
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Test Document', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' }, // Add CurrentDateISO for robust testing
            processedContent: 'Hello world.'
        });
        this.removeShortcodesStub.returns('Hello world.');
        this.ensureAndPreprocessHeadingStub
            .withArgs('Hello world.', 'Test Document', false)
            .returns('# Test Document\n\nHello world.');
        
        this.renderMarkdownToHtmlStub.returns(expectedRenderedHtml);

        // CONFIGURE generateSlug STUB for filename generation
        this.generateSlugStub.withArgs('Test Document').returns('test-document');
        this.generateSlugStub.withArgs('test-doc').returns('test-doc');

        // Configure math_integration stub (math is explicitly disabled for this scenario)
        this.getMathCssContentStub.resolves([]); // No math CSS is expected

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should call pdfGenerator.generatePdf with correctly prepared HTML, path, PDF options, and CSS', async function() {
        const data = {
            markdownFilePath: '/path/to/test-doc.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            css_files: [pluginCssFileName], // Specify CSS files in config
            math: { enabled: false }, // Math is disabled
            toc_options: { enabled: false },
            pdf_options: { // Plugin-specific PDF options
                format: 'Letter',
                margin: { top: '0.5in' } // Plugin-specific margin
            }
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: { // Global PDF options
                printBackground: true,
                margin: { left: '1in' } // Global margin to be merged
            }
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null; // Let the handler derive the filename

        const expectedOutputPdfPath = path.join(outputDir, 'test-document.pdf');
        const expectedCombinedCssContent = [pluginCssContent]; // Only plugin CSS for this test
        // Expected merged PDF options: global properties overridden by plugin, margins merged deeply
        const expectedMergedPdfOptions = {
            format: 'Letter',        // From pluginSpecificConfig
            printBackground: true,   // From globalConfig
            margin: {
                top: '0.5in',        // From pluginSpecificConfig.pdf_options.margin
                left: '1in'          // From globalConfig.global_pdf_options.margin
            }
        };

        // Call the method under test, including pluginBasePath for relative path resolution
        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, pluginBasePath);

        // Assertions for core file system operations for markdown and output directory
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;

        // Assertions for markdown processing pipeline steps
        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        expect(this.removeShortcodesStub.calledOnce).to.be.true;
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        expect(this.renderMarkdownToHtmlStub.calledOnce).to.be.true;
        expect(this.getMathCssContentStub.notCalled).to.be.true; // Math is disabled, so no call expected

        // Assert CSS file processing: Verify that existsSync and readFile were called for the CSS file
        expect(this.existsSyncStub.calledWith(path.resolve(pluginBasePath, pluginCssFileName))).to.be.true;
        expect(this.readFileStub.calledWith(path.resolve(pluginBasePath, pluginCssFileName), 'utf8')).to.be.true;

        // Crucial Assertion: Verify generatePdf was called with all correctly prepared arguments
        expect(this.generatePdfStub.calledOnce).to.be.true;
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        expect(actualHtmlContent).to.equal(expectedRenderedHtml);
        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);
        expect(actualPdfOptions).to.deep.equal(expectedMergedPdfOptions);
        expect(actualCssContentArray).to.deep.equal(expectedCombinedCssContent);

        // Verify the function returns the correct output path
        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
