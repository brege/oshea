// test/integration/default-handler/default-handler.test.2.2.12.js
// This file assumes 'test/setup.js' is loaded via Mocha's --require option.

describe('DefaultHandler (Level 2 - Subsystem Integration Test 2.2.12)', () => {
    // defaultHandler and all stub functions are now available via 'this' context
    // thanks to the 'test/setup.js' --require file.

    // 2.2.12 TEST_TARGET: `default_handler`
    // SCENARIO_DESCRIPTION: Test `handle` gracefully manages errors during Markdown file reading, returning `null`.
    it('should gracefully handle errors during Markdown file reading', async function() { // Use 'function' for 'this' context
        const data = { markdownFilePath: '/input/nonexistent.md' };
        const pluginSpecificConfig = {
            inject_fm_title_as_h1: true,
            remove_shortcodes_patterns: [],
            pdf_options: {}
        };
        const globalConfig = { global_pdf_options: { margin: {} } };
        const outputDir = '/output';
        const outputFilenameOpt = undefined;
        const pluginBasePath = '/plugins/test';

        // Mock fss.existsSync to return false, simulating a non-existent file
        this.existsSyncStub.withArgs('/input/nonexistent.md').returns(false);

        // --- MODIFIED START ---
        // Since the method now returns null instead of throwing, we await the result directly.
        const result = await this.defaultHandler.generate(
            data,
            pluginSpecificConfig,
            globalConfig,
            outputDir,
            outputFilenameOpt,
            pluginBasePath
        );

        // Assert that the result is null as expected on failure
        expect(result).to.be.null;
        
        // Assert that no further processing (like PDF generation) was attempted
        expect(this.readFileStub.notCalled).to.be.true;
        expect(this.mkdirStub.notCalled).to.be.true;
        expect(this.extractFrontMatterStub.notCalled).to.be.true;
        expect(this.generatePdfStub.notCalled).to.be.true;
        // --- MODIFIED END ---
    });
});
