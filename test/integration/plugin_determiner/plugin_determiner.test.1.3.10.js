// test/integration/plugin_determiner/plugin_determiner.test.1.3.10.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.10)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/another-document.md';
    const DUMMY_MARKDOWN_FILENAME = 'another-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/another-document.config.yaml';
    const PLUGIN_NAME = 'direct-plugin';
    const EXPECTED_PLUGIN_CONFIG_PATH_SUBDIR = `/test/path/to/${PLUGIN_NAME}/${PLUGIN_NAME}.config.yaml`;
    const EXPECTED_PLUGIN_CONFIG_PATH_DIRECT = `/test/path/to/${PLUGIN_NAME}.config.yaml`;


    beforeEach(function() {
        // Reset stubs before each test to ensure isolation
        mockFsPromises = {
            readFile: sinon.stub(),
        };
        mockFsSync = {
            existsSync: sinon.stub().returns(false), // Default to false for all paths initially
            statSync: sinon.stub(),
        };
        // Mock path methods to simulate their basic behavior and explicitly define paths
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
        console.lastLog = "";
    });

    afterEach(function() {
        // Restore original console methods
        consoleLogStub.restore();
        consoleWarnStub.restore();
        // Clear DEBUG environment variable if set by test
        delete process.env.DEBUG;
    });

    // Scenario 1.3.10: Test "self-activation" logic: if no subdirectory, a plugin specified by name
    // is resolved to a path directly in the markdown file's directory (e.g., markdownDir/pluginName.config.yaml).
    it('1.3.10 Should self-activate a plugin name from front matter to a path directly in the markdown directory if subdirectory is not found', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Explicitly mock path methods for `localConfigPath` and self-activation path derivation
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILE);
        mockPath.dirname.withArgs(DUMMY_MARKDOWN_FILE).returns('/test/path/to');
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE, '.md').returns('another-document');
        mockPath.extname.withArgs(DUMMY_MARKDOWN_FILE).returns('.md');
        mockPath.resolve.withArgs('/test/path/to', 'another-document.config.yaml').returns(DUMMY_LOCAL_CONFIG_FILE);

        // Mock `path.join` for the potential plugin config paths
        mockPath.join.withArgs('/test/path/to', PLUGIN_NAME, `${PLUGIN_NAME}.config.yaml`).returns(EXPECTED_PLUGIN_CONFIG_PATH_SUBDIR);
        mockPath.join.withArgs('/test/path/to', `${PLUGIN_NAME}.config.yaml`).returns(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT);


        // Mock existence of markdown file, and DIRECT self-activated plugin config file
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(false); // Ensure local config is not found
        mockFsSync.existsSync.withArgs(EXPECTED_PLUGIN_CONFIG_PATH_SUBDIR).returns(false); // Subdirectory check fails
        mockFsSync.existsSync.withArgs(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT).returns(true); // Direct path check succeeds

        // Mock statSync to confirm the direct path is a file
        mockFsSync.statSync.withArgs(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT).returns({ isFile: () => true });

        // Mock readFile for markdown file with front matter plugin name
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
md_to_pdf_plugin: ${PLUGIN_NAME}
---
# Markdown Content`);

        // Mock markdownUtils.extractFrontMatter to return the front matter plugin name
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: PLUGIN_NAME },
            content: '# Markdown Content'
        });

        // Mock path.basename for logging output
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILENAME);

        // Set DEBUG environment variable to check debug logging
        process.env.DEBUG = 'true';

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT);
        expect(result.source).to.equal(`front matter in '${DUMMY_MARKDOWN_FILENAME}' (self-activated via direct path)`);
        expect(result.localConfigOverrides).to.be.null;

        // Verify relevant dependencies were called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true; // Checked, but mocked false
        expect(mockFsSync.existsSync.calledWith(EXPECTED_PLUGIN_CONFIG_PATH_SUBDIR)).to.be.true; // Checked, and mocked false
        expect(mockFsSync.existsSync.calledWith(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT)).to.be.true; // Checked, and mocked true
        expect(mockFsSync.statSync.calledWith(EXPECTED_PLUGIN_CONFIG_PATH_DIRECT)).to.be.true;
        expect(mockPath.dirname.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockPath.join.calledWith('/test/path/to', PLUGIN_NAME, `${PLUGIN_NAME}.config.yaml`)).to.be.true;
        expect(mockPath.join.calledWith('/test/path/to', `${PLUGIN_NAME}.config.yaml`)).to.be.true;
        expect(mockYaml.load.called).to.be.false;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for debug and info messages
        expect(consoleLogStub.calledTwice).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`DEBUG (plugin_determiner): Self-activating from direct path: ${EXPECTED_PLUGIN_CONFIG_PATH_DIRECT}`);
        expect(consoleLogStub.getCall(1).args[0]).to.include(`INFO: Using plugin '${EXPECTED_PLUGIN_CONFIG_PATH_DIRECT}' (determined via front matter in '${DUMMY_MARKDOWN_FILENAME}' (self-activated via direct path))`);
        expect(consoleWarnStub.called).to.be.false;
    });
});
