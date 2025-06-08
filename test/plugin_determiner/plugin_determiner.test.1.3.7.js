// test/plugin_determiner/plugin_determiner.test.1.3.7.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.7)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/malformed-fm-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/malformed-fm-document.config.yaml';
    const MALFORMED_FM_ERROR_MESSAGE = 'Malformed front matter: YAML parsing failed';

    beforeEach(function() {
        // Reset stubs before each test to ensure isolation
        mockFsPromises = {
            readFile: sinon.stub(),
        };
        // Default existsSync to false, then set specific true cases
        mockFsSync = {
            existsSync: sinon.stub().returns(false), 
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

    // Scenario 1.3.7: Verify `determinePluginToUse` gracefully handles errors
    // (e.g., malformed YAML) when reading front matter from the Markdown file.
    it('1.3.7 Should handle malformed front matter gracefully and default to defaultPluginName', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock existence of markdown file, but ensure local config file is mocked as non-existent.
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        // DUMMY_LOCAL_CONFIG_FILE is implicitly false due to the default `returns(false)` set in beforeEach,
        // and also explicitly by this. This means the `if (fss.existsSync(localConfigPath))` block is skipped.
        // We ensure that the existsSync call *is* made, even if it returns false.

        // Mock path.resolve to return the absolute path for markdown file
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILE);

        // Mock readFile for markdown file (content doesn't matter much as extractFrontMatter will throw)
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
  bad: yaml: format
---
# Markdown Content`);

        // Mock markdownUtils.extractFrontMatter to throw an error, simulating malformed front matter
        mockMarkdownUtils.extractFrontMatter.throws(new Error(MALFORMED_FM_ERROR_MESSAGE));

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(defaultPluginName);
        expect(result.source).to.equal('default');
        expect(result.localConfigOverrides).to.be.null;

        // Verify relevant dependencies were called/not called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        
        // Corrected assertion: existsSync for local config *is* called after FM error handling.
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockYaml.load.called).to.be.false; // This should still be false because existsSync for local config returns false.
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for the warning message from the error handling
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.getCall(0).args[0]).to.include(`WARN (plugin_determiner): Could not read or parse front matter from ${DUMMY_MARKDOWN_FILE}: ${MALFORMED_FM_ERROR_MESSAGE}`);
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${defaultPluginName}' (determined via default)`);
    });
});
