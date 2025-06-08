// test/plugin_determiner/plugin_determiner.test.1.3.1.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.1)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/my-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/my-document.config.yaml';

    beforeEach(function() {
        // Reset stubs before each test to ensure isolation
        mockFsPromises = {
            readFile: sinon.stub(),
        };
        mockFsSync = {
            existsSync: sinon.stub(),
            statSync: sinon.stub(),
        };
        // Mock path methods to simulate their basic behavior for non-file operations
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
        mockProcessCwd = sinon.stub(); // This should not be called in this specific scenario

        // Assemble dependencies object for injection
        dependencies = {
            fsPromises: mockFsPromises,
            fsSync: mockFsSync,
            path: mockPath,
            yaml: mockYaml,
            markdownUtils: mockMarkdownUtils,
            processCwd: mockProcessCwd,
        };

        // Stub console.log and console.warn to prevent actual output during tests
        consoleLogStub = sinon.stub(console, 'log');
        consoleWarnStub = sinon.stub(console, 'warn');
        // Clear console.lastLog which is a global hack in the module
        console.lastLog = "";
    });

    afterEach(function() {
        // Restore original console methods after each test
        consoleLogStub.restore();
        consoleWarnStub.restore();
    });

    // Scenario 1.3.1: Verify `determinePluginToUse` correctly prioritizes a plugin
    // specified via the CLI argument (`args.plugin`) over all other sources.
    it('1.3.1 Should prioritize CLI plugin over front matter and local config', async function() {
        // Arrange
        const cliPluginName = 'cli-priority-plugin';
        const fmPluginName = 'front-matter-plugin';
        const localCfgPluginName = 'local-config-plugin';
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            plugin: cliPluginName // CLI plugin is present
        };

        // Mock file system to simulate existence of markdown and local config files
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true);

        // Mock readFile for markdown file to contain front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
md_to_pdf_plugin: ${fmPluginName}
---
# Markdown Content`);

        // Mock readFile for local config file to contain a plugin and an override
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`plugin: ${localCfgPluginName}
someOverride: value`);

        // Mock markdownUtils.extractFrontMatter to return the front matter plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: fmPluginName },
            content: '# Markdown Content'
        });

        // Mock yaml.load to return the local config plugin and override
        mockYaml.load.returns({
            plugin: localCfgPluginName,
            someOverride: 'value'
        });

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(cliPluginName);
        expect(result.source).to.equal('CLI option');
        expect(result.localConfigOverrides).to.deep.equal({ someOverride: 'value' }); // Ensure overrides are correctly passed through

        // Verify that relevant dependencies were called
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true;
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockProcessCwd.called).to.be.false; // Not called as pluginSpec is not a relative path requiring CWD.

        // Check console output for the override message and final determination message
        expect(consoleLogStub.calledTwice).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Plugin '${cliPluginName}' specified via CLI, overriding front matter plugin '${fmPluginName}'.`);
        expect(consoleLogStub.getCall(1).args[0]).to.include(`INFO: Using plugin '${cliPluginName}' (determined via CLI option)`);
        expect(consoleWarnStub.called).to.be.false; // No warnings expected in this scenario.
    });
});
