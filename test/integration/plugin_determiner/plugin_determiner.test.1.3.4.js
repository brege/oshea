// test/integration/plugin_determiner/plugin_determiner.test.1.3.4.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.4)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/fourth-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/fourth-document.config.yaml';
    // No specific filename needed for logging if source is 'default'

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

    // Scenario 1.3.4: Test `determinePluginToUse` returns the `defaultPluginName`
    // when no plugin is specified via CLI, front matter, or local config.
    it('1.3.4 Should return the default plugin when no plugin is specified anywhere', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock file system to simulate existence of markdown and local config files,
        // but with no plugin specified within them.
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true);

        // Mock readFile for markdown file: no front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
some_other_key: some_value
---
# Markdown Content`);

        // Mock readFile for local config file: no plugin, no overrides
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`someOtherConfig: true`);

        // Mock markdownUtils.extractFrontMatter: no md_to_pdf_plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { some_other_key: 'some_value' },
            content: '# Markdown Content'
        });

        // Mock yaml.load: returns an object without a 'plugin' field
        mockYaml.load.returns({ someOtherConfig: true });

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(defaultPluginName);
        expect(result.source).to.equal('default');
        expect(result.localConfigOverrides).to.deep.equal({ someOtherConfig: true }); // Overrides should still be captured if present, even if no plugin found

        // Verify that relevant dependencies were called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true;
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output for the single expected INFO message
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${defaultPluginName}' (determined via default)`);
        expect(consoleWarnStub.called).to.be.false; // No warnings expected.
    });
});
