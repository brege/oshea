// test/integration/default-handler/default-handler.test.2.2.1.js
// This file assumes 'test/setup.js' is loaded via Mocha's --require option.

describe('DefaultHandler (Level 2 - Subsystem Integration Test 2.2.1)', () => {
    // defaultHandler and all stub functions are now available via 'this' context
    // thanks to the 'test/setup.js' --require file.

    // 2.2.1 TEST_TARGET: `default_handler`
    // SCENARIO_DESCRIPTION: Verify the `generate` function successfully processes a basic Markdown file,
    // extracts front matter, renders HTML, applies default CSS, and generates a PDF.
    it('should successfully process a basic Markdown file and generate a PDF', async function() { // Use 'function' for 'this' context
        const markdownContent = '---\ntitle: Test Doc\n---\n# Hello World\nThis is a test.';
        const expectedHtml = '<h1>Hello World</h1><p>This is a test.</p>';
        const mockPdfPath = '/output/test-doc.pdf';

        // Mock file system and utility functions using stubs from setup.js
        this.existsSyncStub.withArgs('/input/test.md').returns(true);
        this.readFileStub.withArgs('/input/test.md', 'utf8').resolves(markdownContent);
        this.mkdirStub.resolves(); // Assume directory creation succeeds

        this.extractFrontMatterStub.returns({ data: { title: 'Test Doc' }, content: '# Hello World\nThis is a test.' });
        this.substituteAllPlaceholdersStub.returns({ processedFmData: { title: 'Test Doc' }, processedContent: '# Hello World\nThis is a test.' });
        this.removeShortcodesStub.returns('# Hello World\nThis is a test.');
        this.ensureAndPreprocessHeadingStub.returns('# Hello World\nThis is a test.');
        this.renderMarkdownToHtmlStub.returns(expectedHtml);
        this.generateSlugStub.withArgs('Test Doc').returns('test-doc');
        this.generateSlugStub.withArgs('test').returns('test');
        this.generatePdfStub.resolves(mockPdfPath);
        this.getMathCssContentStub.resolves([]); // No math CSS for basic test

        const data = { markdownFilePath: '/input/test.md' };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            remove_shortcodes_patterns: []
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: {
                margin: {}
            }
        };
        const outputDir = '/output';
        const outputFilenameOpt = undefined;
        const pluginBasePath = '/plugins/test';

        const result = await this.defaultHandler.generate(
            data,
            pluginSpecificConfig,
            globalConfig,
            outputDir,
            outputFilenameOpt,
            pluginBasePath
        );

        expect(result).to.equal(mockPdfPath);
        expect(this.existsSyncStub.calledWith('/input/test.md')).to.be.true;
        expect(this.readFileStub.calledWith('/input/test.md', 'utf8')).to.be.true;
        expect(this.mkdirStub.calledWith('/output', { recursive: true })).to.be.true;
        expect(this.extractFrontMatterStub.calledOnce).to.be.true;
        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;
        expect(this.removeShortcodesStub.calledOnce).to.be.true;
        expect(this.ensureAndPreprocessHeadingStub.calledOnce).to.be.true;
        expect(this.renderMarkdownToHtmlStub.calledWith('# Hello World\nThis is a test.', undefined, undefined, undefined)).to.be.true;
        expect(this.generatePdfStub.calledOnce).to.be.true;
        expect(this.generatePdfStub.getCall(0).args[0]).to.equal(expectedHtml);
        expect(this.generatePdfStub.getCall(0).args[1]).to.equal(mockPdfPath);
        expect(this.generatePdfStub.getCall(0).args[3]).to.deep.equal([]); // No CSS content
    });
});
