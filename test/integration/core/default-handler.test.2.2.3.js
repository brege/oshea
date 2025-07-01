// test/integration/core/default-handler.test.2.2.3.js
// This file assumes 'test/setup.js' is loaded via Mocha's --require option.

describe('DefaultHandler (Level 2 - Subsystem Integration Test 2.2.3)', () => {
    // defaultHandler and all stub functions are now available via 'this' context
    // thanks to the 'test/setup.js' --require file.

    // 2.2.3 TEST_TARGET: `default_handler`
    // SCENARIO_DESCRIPTION: Verify `generate` correctly substitutes placeholders in Markdown content before rendering.
    // Marked as SKIPPED due to persistent and inexplicable string comparison anomalies in environment.
    it('should correctly substitute placeholders in Markdown content', async function() {
        const markdownContent = '---\ntitle: Placeholder Test\nauthor: {{ .authorName }}\ndate: 2023-01-15\n---\nHello {{ .name }}!';
        const contentWithoutFm = 'Hello {{ .name }}!';

        const processedFmData = {
            title: 'Placeholder Test',
            author: 'John Doe',
            name: 'World',
            date: '2023-01-15',
            CurrentDateISO: '2023-01-15',
            CurrentDateFormatted: sinon.match.string
        };

        const contentAfterSubst = 'Hello World!';
        const mockPdfPath = '/output/placeholder-test-john-doe-2023-01-15.pdf';

        this.existsSyncStub.withArgs('/input/placeholder.md').returns(true);
        this.readFileStub.withArgs('/input/placeholder.md', 'utf8').resolves(markdownContent);
        this.mkdirStub.resolves();

        this.extractFrontMatterStub.returns({ data: { title: 'Placeholder Test', author: '{{ .authorName }}', date: '2023-01-15' }, content: contentWithoutFm });

        this.substituteAllPlaceholdersStub.returns({ processedFmData: processedFmData, processedContent: contentAfterSubst });

        this.removeShortcodesStub.returns(contentAfterSubst);
        this.ensureAndPreprocessHeadingStub.returns(`# Placeholder Test\n${contentAfterSubst}`);
        this.renderMarkdownToHtmlStub.returns('<h1>Placeholder Test</h1><p>Hello World!</p>');
        this.generateSlugStub.withArgs('Placeholder Test').returns('placeholder-test');
        this.generateSlugStub.withArgs('John Doe').returns('john-doe');
        this.generateSlugStub.withArgs('placeholder').returns('placeholder');
        this.generatePdfStub.resolves(mockPdfPath);
        this.getMathCssContentStub.resolves([]);

        const data = { markdownFilePath: '/input/placeholder.md' };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            remove_shortcodes_patterns: [],
            params: { authorName: 'John Doe' }
        };
        const globalConfig = {
            global_remove_shortcodes: [],
            global_pdf_options: { margin: {} },
            params: { name: 'World' }
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

        expect(this.substituteAllPlaceholdersStub.calledOnce).to.be.true;

        const actualContextForPlaceholders = this.substituteAllPlaceholdersStub.getCall(0).args[1];
        expect(actualContextForPlaceholders).to.deep.include({
            title: 'Placeholder Test',
            author: '{{ .authorName }}',
            date: '2023-01-15',
            name: 'World',
            authorName: 'John Doe',
        });

        expect(this.removeShortcodesStub.calledWith(contentAfterSubst, sinon.match.any)).to.be.true;

        expect(this.renderMarkdownToHtmlStub.calledWith(`# Placeholder Test\n${contentAfterSubst}`, undefined, undefined, undefined)).to.be.true;

        expect(result).to.equal(mockPdfPath);
        expect(this.generatePdfStub.getCall(0).args[1]).to.equal(path.join(outputDir, 'placeholder-test-john-doe-2023-01-15.pdf'));
    });
});
