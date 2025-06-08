// test/default-handler/default-handler.test.2.2.11.js

// The 'expect' and 'sinon' globals are provided by test/setup.js
// along with stubbed versions of the modules being tested.
// The DefaultHandler class will be the one whose dependencies are stubbed.
const DefaultHandler = require('../../src/default_handler'); // Path from test/default-handler/ to src/default_handler.js
const path = require('path'); // Available globally via setup.js
const fs = require('fs').promises; // Available globally via setup.js
const fss = require('fs'); // Available globally via setup.js

describe('DefaultHandler (L2Y2) - Scenario 2.2.11: Output Filename Determination', function() {
    let defaultHandler;
    const markdownContent = `---\ntitle: My Awesome Document\nauthor: John Doe\ndate: 2023-10-26\n---\nContent here.`;
    const expectedHtml = `<h1>My Awesome Document</h1><p>Content here.</p>`;

    beforeEach(function() {
        defaultHandler = this.defaultHandler;

        // Configure file system stubs for markdown file
        this.existsSyncStub.withArgs('/path/to/my-document.md').returns(true);
        this.readFileStub.withArgs('/path/to/my-document.md', 'utf8').resolves(markdownContent);
        this.mkdirStub.resolves();

        // Configure markdown_utils stubs for content processing and filename derivation
        this.extractFrontMatterStub.returns({
            data: { title: 'My Awesome Document', author: 'John Doe', date: '2023-10-26' },
            content: 'Content here.'
        });
        // Crucial for filename derivation: ensure processedFmData contains the date and CurrentDateISO match for date derivation logic
        this.substituteAllPlaceholdersStub.returns({
            processedFmData: { title: 'My Awesome Document', author: 'John Doe', date: '2023-10-26', CurrentDateISO: '2023-10-26' },
            processedContent: 'Content here.'
        });
        this.removeShortcodesStub.returns('Content here.');
        this.ensureAndPreprocessHeadingStub
            .withArgs('Content here.', 'My Awesome Document', false)
            .returns('# My Awesome Document\n\nContent here.');
        
        this.renderMarkdownToHtmlStub.returns(expectedHtml);

        // CONFIGURE generateSlug STUB for filename generation:
        // Mock expected slug results for title, author, and base input name.
        this.generateSlugStub.withArgs('My Awesome Document').returns('my-awesome-document');
        this.generateSlugStub.withArgs('John Doe').returns('john-doe');
        this.generateSlugStub.withArgs('my-document').returns('my-document'); // Fallback for baseInputName

        // Configure math_integration and CSS stubs (not primarily relevant for this scenario, but ensure they don't break)
        this.getMathCssContentStub.resolves([]);
        this.readFileStub.withArgs(sinon.match.string, 'utf8').resolves(''); // For any CSS files the handler might try to read

        // Configure pdf_generator stub
        this.generatePdfStub.resolves();
    });

    it('should correctly determine the output filename based on front matter (title, author, date)', async function() {
        const data = {
            markdownFilePath: '/path/to/my-document.md'
        };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            css_files: [],
            math: { enabled: false },
            toc_options: { enabled: false },
            pdf_options: {}
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: {}
        };
        const outputDir = '/path/to/output';
        const outputFilenameOpt = null; // Test case: let the handler derive the filename

        // Expected filename based on the logic in default_handler.js using title, author, and date
        const expectedDerivedFilename = 'my-awesome-document-john-doe-2023-10-26.pdf';
        const expectedOutputPdfPath = path.join(outputDir, expectedDerivedFilename);

        // Call the method under test, providing a mock pluginBasePath for path resolution
        const resultPath = await defaultHandler.generate(data, pluginSpecificConfig, globalConfig, outputDir, outputFilenameOpt, '/some/plugin/base/path');

        // Assertions for core file system operations
        expect(this.existsSyncStub.calledWith(data.markdownFilePath)).to.be.true;
        expect(this.readFileStub.calledWith(data.markdownFilePath, 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith(outputDir, { recursive: true })).to.be.true;

        // Assert that generatePdf was called with the correct output path, verifying filename determination
        expect(this.generatePdfStub.calledOnce).to.be.true;
        const [
            actualHtmlContent,
            actualOutputPdfPath,
            actualPdfOptions,
            actualCssContentArray
        ] = this.generatePdfStub.getCall(0).args;

        expect(actualOutputPdfPath).to.equal(expectedOutputPdfPath);

        // Verify the function returns the correct output path
        expect(resultPath).to.equal(expectedOutputPdfPath);

        // Assert the slug generation calls that *should* happen for filename derivation in this specific test case.
        // The generateSlugStub for 'my-document' (baseInputName) is only called if titleSlug is falsy,
        // which is not the case here, so we remove that specific assertion.
        expect(this.generateSlugStub.calledWith('My Awesome Document')).to.be.true;
        expect(this.generateSlugStub.calledWith('John Doe')).to.be.true;
    });
});
