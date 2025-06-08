// test/plugin_determiner/plugin_determiner.test.1.3.14.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.14) - Logging Mechanism', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE_1 = '/test/path/to/logging-override-doc.md';
    const DUMMY_MARKDOWN_FILENAME_1 = 'logging-override-doc.md';
    const DUMMY_LOCAL_CONFIG_FILE_1 = '/test/path/to/logging-override-doc.config.yaml';

    const CLI_PLUGIN_NAME = 'cli-test-plugin';
    const FM_PLUGIN_NAME = 'fm-test-plugin';
    const LOCAL_CFG_PLUGIN_NAME = 'local-test-plugin';


    beforeEach(function() {
        // Reset stubs before each test to ensure isolation
        mockFsPromises = {
            readFile: sinon.stub(),
        };
        mockFsSync = {
            existsSync: sinon.stub().returns(false), // Default to false for all paths initially
            statSync: sinon.stub(),
        };
        // Mock path methods to simulate their basic behavior
        mockPath = {
            resolve: sinon.stub().callsFake((...args) => args.join('/')),
            dirname: sinon.stub().callsFake((p) => p.split('/').slice(0, -1).join('/')),
            basename: sinon.stub().callsFake((p, ext) => {
                const base = p.split('/').pop();
                return ext ? base.replace(ext, '') : base;
            }),
            extname: sinon.stub().callsFake((p) => {
                const parts = p.split('.');
                return parts.length > 1 ? '.' + parts.pop() : '';
            }),
            join: sinon.stub().callsFake((...args) => args.join('/')),
        };
        mockYaml = {
            load: sinon.stub(),
        };
        mockMarkdownUtils = {
            extractFrontMatter: sinon.stub(),
        };
        mockProcessCwd = sinon.stub();

        // Assemble dependencies object for injection
        dependencies = {
            fsPromises: mockFsPromises,
            fsSync: mockFsSync,
            path: mockPath,
            yaml: mockYaml,
            markdownUtils: mockMarkdownUtils,
            processCwd: mockProcessCwd,
        };

        // Stub console.log and console.warn
        consoleLogStub = sinon.stub(console, 'log');
        consoleWarnStub = sinon.stub(console, 'warn');
        console.lastLog = ""; // Ensure global hack is reset
    });

    afterEach(function() {
        // Restore original console methods
        consoleLogStub.restore();
        consoleWarnStub.restore();
    });

    // Scenario 1.3.14.1: CLI Overrides Front Matter - Verify two distinct logs (override and final)
    it('1.3.14.1 Should log both override message and final determination when CLI overrides front matter', async function() {
        // Arrange
        const defaultPluginName = 'default';
        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE_1,
            plugin: CLI_PLUGIN_NAME // CLI plugin present
        };

        // Mock existence of files
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE_1).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE_1).returns(false); // No local config

        // Mock path methods for this scenario
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE_1).returns(DUMMY_MARKDOWN_FILE_1);
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE_1).returns(DUMMY_MARKDOWN_FILENAME_1);
        mockPath.dirname.withArgs(DUMMY_MARKDOWN_FILE_1).returns('/test/path/to');
        mockPath.extname.withArgs(DUMMY_MARKDOWN_FILE_1).returns('.md');
        mockPath.resolve.withArgs('/test/path/to', 'logging-override-doc.config.yaml').returns(DUMMY_LOCAL_CONFIG_FILE_1);

        // Mock readFile for markdown file with front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE_1, 'utf8').resolves(`---
md_to_pdf_plugin: ${FM_PLUGIN_NAME}
---
# Content`);

        // Mock markdownUtils.extractFrontMatter to return the front matter plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: FM_PLUGIN_NAME },
            content: '# Content'
        });

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(CLI_PLUGIN_NAME);
        expect(result.source).to.equal('CLI option');
        expect(result.localConfigOverrides).to.be.null;

        // Check console output: Expect two calls
        expect(consoleLogStub.calledTwice).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Plugin '${CLI_PLUGIN_NAME}' specified via CLI, overriding front matter plugin '${FM_PLUGIN_NAME}'.`);
        expect(consoleLogStub.getCall(1).args[0]).to.include(`INFO: Using plugin '${CLI_PLUGIN_NAME}' (determined via CLI option)`);
        expect(consoleWarnStub.called).to.be.false;
    });

    // Scenario 1.3.14.2: Lazy Load Default - Verify no log for final determination if redundant
    it('1.3.14.2 Should not log final determination if isLazyLoad and determinationSource is default (redundant)', async function() {
        // Arrange
        const defaultPluginName = 'default';
        const args = {
            isLazyLoad: true, // Crucial for this scenario
            // No 'plugin' or 'markdownFile' properties, so it defaults
        };

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(defaultPluginName);
        expect(result.source).to.equal('default');
        expect(result.localConfigOverrides).to.be.null;

        // Check console output: Expect NO calls, as the final log should be suppressed due to redundancy check
        // (!args.isLazyLoad || determinationSource !== 'default') is false || false = false, so outer if is skipped.
        expect(consoleLogStub.called).to.be.false;
        expect(consoleWarnStub.called).to.be.false;
    });

    // Scenario 1.3.14.3: Standard determination (non-lazy load, not default), one log
    it('1.3.14.3 Should log final determination once when not lazy load and not default', async function() {
        // Arrange
        const defaultPluginName = 'default';
        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE_1,
            // No 'plugin' property
            isLazyLoad: false // Explicitly set to false
        };

        // Mock existence of markdown file, no local config, FM provides a plugin name
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE_1).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE_1).returns(false);

        // Mock path methods for this scenario
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE_1).returns(DUMMY_MARKDOWN_FILE_1);
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE_1).returns(DUMMY_MARKDOWN_FILENAME_1);
        mockPath.dirname.withArgs(DUMMY_MARKDOWN_FILE_1).returns('/test/path/to');
        mockPath.extname.withArgs(DUMMY_MARKDOWN_FILE_1).returns('.md');
        mockPath.resolve.withArgs('/test/path/to', 'logging-override-doc.config.yaml').returns(DUMMY_LOCAL_CONFIG_FILE_1);

        // Mock readFile for markdown file with front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE_1, 'utf8').resolves(`---
md_to_pdf_plugin: ${FM_PLUGIN_NAME}
---
# Content`);

        // Mock markdownUtils.extractFrontMatter to return the front matter plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: FM_PLUGIN_NAME },
            content: '# Content'
        });

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(FM_PLUGIN_NAME);
        expect(result.source).to.equal(`front matter in '${DUMMY_MARKDOWN_FILENAME_1}'`);
        expect(result.localConfigOverrides).to.be.null;

        // Check console output: Expect one call
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${FM_PLUGIN_NAME}' (determined via front matter in '${DUMMY_MARKDOWN_FILENAME_1}')`);
        expect(consoleWarnStub.called).to.be.false;
    });
});
