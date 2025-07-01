// test/integration/core/default-handler.test.2.2.8.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../../src/core/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js
const fs = require('fs').promises; // Available globally via setup.js
const fss = require('fs'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.8: CSS File Resolution and Merging', function() {
    let defaultHandler;
    const markdownContent = `---\ntitle: Document with Custom CSS\n---\nHello world.`;
    const expectedRenderedHtml = `<h1>Document with Custom CSS</h1><p>Hello world.</p>`;

    // Define mock paths and content for CSS files
    const pluginBasePath = '/mock/plugins/my-plugin'; // A mock base path for the plugin
    const relativeCssFileName = 'styles/plugin-style.css';
    const absoluteCssFileName = '/absolute/path/to/global.css';

    const pluginCssContent = '/* content of plugin-style.css */';
    const globalCssContent = '/* content of global.css */';

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs for markdown file
        this.existsSyncStub.withArgs('/path/to/doc.md').returns(true);
        this.readFileStub.withArgs('/path/to/doc.md', 'utf8').resolves(markdownContent);
        this.mkdirStub.resolves();

        // Stub CSS file existence and content based on their resolved paths
        this.existsSyncStub.withArgs(path.resolve(pluginBasePath, relativeCssFileName)).returns(true);
        this.readFileStub.withArgs(path.resolve(pluginBasePath, relativeCssFileName), 'utf8').resolves(pluginCssContent);

        this.existsSyncStub.withArgs(absoluteCssFileName).returns(true); // For absolute path
        this.readFileStub.withArgs(absoluteCssFileName, 'utf8').resolves(globalCssContent);

        // Configure markdown_utils stubs for content processing
        this.extractFrontMatterStub.returns({
            data: { title: 'Document with Custom CSS' },
            content: 'Hello world.'
        });
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'Document with Custom CSS', CurrentDateISO: '2025-06-05', CurrentDateFormatted: 'June 5, 2025' },
            processedContent: 'Hello world.'
        });
        this.removeShortcodesStub.returns('Hello world.');
        this.ensureAndPreprocessHeadingStub
            .withArgs('Hello world.', 'Document with Custom CSS', false)
            .returns('# Document with Custom CSS\n\nHello world.');

        this.renderMarkdownToHtmlStub.returns(expectedRenderedHtml);

        // CONFIGURE generateSlug STUB for filename generation
        this.generateSlugStub.withArgs('Document with Custom CSS').returns('document-with-custom-css');
        this.generateSlugStub.withArgs('doc').returns('doc');

        // Configure math_integration stub (math is explicitly disabled for this scenario)
        this.getMathCssContentStub.resolves([]); // No math CSS is expected

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should resolve and merge CSS files from pluginSpecificConfig.css_files and inject them into HTML output', async function() {
        const data = {
            markdownFilePath: '/path/to/doc.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            css_files: [relativeCssFileName, absoluteCssFileName], // Specify CSS files in config
            math: { enabled: false }, // Math is disabled
            toc_options: { enabled: false },
            pdf_options: {}
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: {}
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null;

        const expectedOutputPdfPath = path.join(outputDir, 'document-with-custom-css.pdf');
        const expectedCombinedCssContent = [pluginCssContent, globalCssContent]; // Expected order and content of CSS

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

        // Assert CSS file resolution and reading: Verify that existsSync and readFile were called for each CSS file
        expect(this.existsSyncStub.calledWith(path.resolve(pluginBasePath, relativeCssFileName))).to.be.true;
        expect(this.readFileStub.calledWith(path.resolve(pluginBasePath, relativeCssFileName), 'utf8')).to.be.true;
        expect(this.existsSyncStub.calledWith(absoluteCssFileName)).to.be.true;
        expect(this.readFileStub.calledWith(absoluteCssFileName, 'utf8')).to.be.true;

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
        expect(actualPdfOptions).to.deep.equal({ margin: {} }); // Default empty margin object expected
        expect(actualCssContentArray).to.deep.equal(expectedCombinedCssContent); // Crucial: assert the combined CSS content

        // Verify the function returns the correct output path
        expect(resultPath).to.equal(expectedOutputPdfPath);
    });
});
