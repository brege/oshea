// test/plugin_determiner/plugin_determiner.test.1.3.8.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.8)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/malformed-local-config-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/malformed-local-config-document.config.yaml'; // Corrected variable name
    const MALFORMED_LOCAL_CONFIG_ERROR_MESSAGE = 'Malformed YAML in local config';

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

    // Scenario 1.3.8: Test `determinePluginToUse` gracefully handles errors
    // (e.g., malformed YAML) when reading the local `.config.yaml` file.
    it('1.3.8 Should handle malformed local config gracefully and default to defaultPluginName', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock existence of markdown file and local config file
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true); // Corrected variable name

        // Mock path.resolve to return the absolute paths
        mockPath.resolve.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILE);
        mockPath.resolve.withArgs(mockPath.dirname(DUMMY_MARKDOWN_FILE), mockPath.basename(DUMMY_MARKDOWN_FILE, mockPath.extname(DUMMY_MARKDOWN_FILE)) + '.config.yaml').returns(DUMMY_LOCAL_CONFIG_FILE); // Corrected variable name

        // Mock readFile for markdown file: no front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
some_other_key: some_value
---
# Markdown Content`);

        // Mock readFile for local config file: content doesn't matter much as yaml.load will throw
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`bad: [yaml`); // Corrected variable name

        // Mock markdownUtils.extractFrontMatter: no md_to_pdf_plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { some_other_key: 'some_value' },
            content: '# Markdown Content'
        });

        // Mock yaml.load to throw an error, simulating malformed local config
        mockYaml.load.throws(new Error(MALFORMED_LOCAL_CONFIG_ERROR_MESSAGE));

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(defaultPluginName);
        expect(result.source).to.equal('default');
        expect(result.localConfigOverrides).to.be.null; // Should be null as parsing failed

        // Verify relevant dependencies were called/not called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true; // Corrected variable name
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true; // Corrected variable name
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for the warning message from the error handling
        expect(consoleWarnStub.calledOnce).to.be.true;
        expect(consoleWarnStub.getCall(0).args[0]).to.include(`WARN (plugin_determiner): Could not read or parse local config file ${DUMMY_LOCAL_CONFIG_FILE}: ${MALFORMED_LOCAL_CONFIG_ERROR_MESSAGE}`); // Corrected variable name
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${defaultPluginName}' (determined via default)`);
    });
});
