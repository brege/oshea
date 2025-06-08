// test/plugin_determiner/plugin_determiner.test.1.3.12.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.12)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/document-with-relative-plugin.md';
    const DUMMY_MARKDOWN_FILENAME = 'document-with-relative-plugin.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/document-with-relative-plugin.config.yaml';
    const RELATIVE_PLUGIN_PATH = './my-relative-plugin';
    const EXPECTED_RESOLVED_PATH = '/test/path/to/my-relative-plugin';
    // Self-activation paths for mocking non-existence (not relevant for final resolved path but part of flow)
    const POTENTIAL_SUBDIR_SELF_ACTIVATION_PATH = `/test/path/to/my-relative-plugin/my-relative-plugin.config.yaml`;
    const POTENTIAL_DIRECT_SELF_ACTIVATION_PATH = `/test/path/to/my-relative-plugin.config.yaml`;


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
    });

    // Scenario 1.3.12: Test `determinePluginToUse` correctly resolves a relative `pluginSpec`
    // (e.g., `./plugin-path`) against the `markdownFilePathAbsolute` when present.
    it('1.3.12 Should resolve a relative pluginSpec from front matter against the markdown file path', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Explicitly mock path methods for `localConfigPath` and general path resolution
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILE);
        mockPath.dirname.withArgs(DUMMY_MARKDOWN_FILE).returns('/test/path/to');
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE, '.md').returns('document-with-relative-plugin');
        mockPath.extname.withArgs(DUMMY_MARKDOWN_FILE).returns('.md');
        mockPath.resolve.withArgs('/test/path/to', 'document-with-relative-plugin.config.yaml').returns(DUMMY_LOCAL_CONFIG_FILE);
        // Crucial mock: resolving the relative plugin path
        mockPath.resolve.withArgs('/test/path/to', RELATIVE_PLUGIN_PATH).returns(EXPECTED_RESOLVED_PATH);

        // Mock `path.join` for self-activation checks (which should NOT be called due to isNameSpec being false)
        mockPath.join.withArgs('/test/path/to', RELATIVE_PLUGIN_PATH, `${RELATIVE_PLUGIN_PATH}.config.yaml`).returns(POTENTIAL_SUBDIR_SELF_ACTIVATION_PATH);
        mockPath.join.withArgs('/test/path/to', `${RELATIVE_PLUGIN_PATH}.config.yaml`).returns(POTENTIAL_DIRECT_SELF_ACTIVATION_PATH);


        // Mock existence of markdown file, but ensure self-activation paths do NOT exist (though they won't be checked)
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(false); // Ensure local config is not found

        // Mock readFile for markdown file with relative plugin path in front matter
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
md_to_pdf_plugin: ${RELATIVE_PLUGIN_PATH}
---
# Markdown Content`);

        // Mock markdownUtils.extractFrontMatter to return the relative plugin path
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: RELATIVE_PLUGIN_PATH },
            content: '# Markdown Content'
        });

        // Mock path.basename for logging output
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILENAME);

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(EXPECTED_RESOLVED_PATH);
        expect(result.source).to.equal(`front matter in '${DUMMY_MARKDOWN_FILENAME}'`); // No self-activated suffix
        expect(result.localConfigOverrides).to.be.null;

        // Verify relevant dependencies were called/not called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        
        // Corrected assertions: self-activation path checks should NOT be called
        expect(mockFsSync.existsSync.calledWith(POTENTIAL_SUBDIR_SELF_ACTIVATION_PATH)).to.be.false;
        expect(mockFsSync.existsSync.calledWith(POTENTIAL_DIRECT_SELF_ACTIVATION_PATH)).to.be.false;
        expect(mockFsSync.statSync.called).to.be.false;
        expect(mockPath.dirname.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        // This is the crucial resolution call, it should still be true.
        expect(mockPath.resolve.calledWith('/test/path/to', RELATIVE_PLUGIN_PATH)).to.be.true; 
        // Path.join for self-activation should NOT be called.
        expect(mockPath.join.calledWith('/test/path/to', RELATIVE_PLUGIN_PATH, `${RELATIVE_PLUGIN_PATH}.config.yaml`)).to.be.false;
        expect(mockPath.join.calledWith('/test/path/to', `${RELATIVE_PLUGIN_PATH}.config.yaml`)).to.be.false;
        
        expect(mockYaml.load.called).to.be.false;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for the single info message
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${EXPECTED_RESOLVED_PATH}' (determined via front matter in '${DUMMY_MARKDOWN_FILENAME}')`);
        expect(consoleWarnStub.called).to.be.false;
    });
});
