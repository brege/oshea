// test/plugin_determiner/plugin_determiner.test.1.3.6.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.6)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/non-existent-document.md';
    const DUMMY_MARKDOWN_FILE_ABSOLUTE = DUMMY_MARKDOWN_FILE; // Path.resolve mock handles this for simplicity

    beforeEach(function() {
        // Reset stubs before each test to ensure isolation
        mockFsPromises = {
            readFile: sinon.stub(),
        };
        mockFsSync = {
            existsSync: sinon.stub(),
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
        console.lastLog = "";
    });

    afterEach(function() {
        // Restore original console methods
        consoleLogStub.restore();
        consoleWarnStub.restore();
    });

    // Scenario 1.3.6: Test `determinePluginToUse` handles a non-existent `args.markdownFile`
    // by not attempting to read front matter or local config and defaulting appropriately.
    it('1.3.6 Should default to defaultPluginName when markdown file does not exist', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock existsSync to return false for the markdown file
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE_ABSOLUTE).returns(false);
        // Mock path.resolve to return the absolute path, as done in the module
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILE_ABSOLUTE);


        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(defaultPluginName);
        expect(result.source).to.equal('default');
        expect(result.localConfigOverrides).to.be.null;

        // Verify that no file system reads or parsing attempts were made beyond existsSync
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE_ABSOLUTE)).to.be.true;
        expect(mockFsPromises.readFile.called).to.be.false;
        expect(mockMarkdownUtils.extractFrontMatter.called).to.be.false;
        expect(mockYaml.load.called).to.be.false;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for the expected warning and info messages
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.getCall(0).args[0]).to.include(`WARN (plugin_determiner): Markdown file not found at ${DUMMY_MARKDOWN_FILE_ABSOLUTE}. Cannot check front matter or local config.`);
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${defaultPluginName}' (determined via default)`);
    });
});
