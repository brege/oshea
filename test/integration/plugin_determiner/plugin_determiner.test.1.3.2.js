// test/integration/plugin_determiner/plugin_determiner.test.1.3.2.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.2)', function() {
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
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/another-document.config.yaml';
    const DUMMY_MARKDOWN_FILENAME = 'another-document.md'; // For path.basename

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
        // These mocks are designed to correctly resolve paths for the dummy files.
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

    // Scenario 1.3.2: Test `determinePluginToUse` correctly prioritizes a plugin
    // specified in the Markdown file's front matter (`frontMatter.md_to_pdf_plugin`)
    // when no CLI argument is present.
    it.skip('1.3.2 Should prioritize front matter plugin when no CLI arg is present', async function() {
        // Arrange
        const fmPluginName = 'front-matter-plugin-from-doc';
        const localCfgPluginName = 'local-config-plugin-from-file';
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property, so CLI arg is not present
        };

        // Mock file system to simulate existence of markdown and local config files
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        // This ensures the local config path calculation is also correctly mocked.
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true);

        // Mock readFile for markdown file to contain front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
md_to_pdf_plugin: ${fmPluginName}
---
# Markdown Content for FM`);

        // Mock readFile for local config file to contain a plugin and an override
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`plugin: ${localCfgPluginName}
anotherOverride: someValue`);

        // Mock markdownUtils.extractFrontMatter to return the front matter plugin
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { md_to_pdf_plugin: fmPluginName },
            content: '# Markdown Content for FM'
        });

        // Mock yaml.load to return the local config plugin and override
        // This is the core of the localConfigOverrides expectation.
        mockYaml.load.returns({
            plugin: localCfgPluginName,
            anotherOverride: 'someValue'
        });

        // Mock path.basename for logging output
        mockPath.basename.withArgs(DUMMY_MARKDOWN_FILE).returns(DUMMY_MARKDOWN_FILENAME);

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(fmPluginName);
        expect(result.source).to.equal(`front matter in '${DUMMY_MARKDOWN_FILENAME}'`);
        expect(result.localConfigOverrides).to.deep.equal({ anotherOverride: 'someValue' });

        // Verify that relevant dependencies were called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true;
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockPath.basename.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockProcessCwd.called).to.be.false; // Not called as pluginSpec is not a relative path requiring CWD.

        // Check console output for the override message and final determination message
        expect(consoleLogStub.calledTwice).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Plugin '${fmPluginName}' from front matter, overriding local config plugin '${localCfgPluginName}'.`);
        expect(consoleLogStub.getCall(1).args[0]).to.include(`INFO: Using plugin '${fmPluginName}' (determined via front matter in '${DUMMY_MARKDOWN_FILENAME}')`);
        expect(consoleWarnStub.called).to.be.false; // No warnings expected in this scenario.
    });
});
