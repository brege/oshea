// test/integration/plugin_determiner/plugin_determiner.test.1.3.5.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.5)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/fifth-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/fifth-document.config.yaml';
    const DUMMY_LOCAL_CONFIG_FILENAME = 'fifth-document.config.yaml'; // For path.basename

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

    // Scenario 1.3.5: Verify `determinePluginToUse` correctly extracts and returns
    // `localConfigOverrides` from the local `.config.yaml` file, excluding the `plugin` field.
    it('1.3.5 Should extract localConfigOverrides from local config file, excluding the plugin field', async function() {
        // Arrange
        const localCfgPluginName = 'plugin-with-overrides';
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock existence of files
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true);

        // Mock markdown file content (no front matter plugin)
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`---
some_other_fm_key: fm_value
---
# Markdown Content`);

        // Mock local config file content with plugin and multiple overrides
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`plugin: ${localCfgPluginName}
header: true
footer: false
margin:
  top: 1in
  bottom: 0.5in
  left: 0.75in`);

        // Mock markdownUtils.extractFrontMatter (no plugin)
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { some_other_fm_key: 'fm_value' },
            content: '# Markdown Content'
        });

        // Mock yaml.load to return the full parsed object
        mockYaml.load.returns({
            plugin: localCfgPluginName,
            header: true,
            footer: false,
            margin: { top: '1in', bottom: '0.5in', left: '0.75in' }
        });

        // Mock path.basename for logging output related to local config file
        mockPath.basename.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(DUMMY_LOCAL_CONFIG_FILENAME);

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        // Expect local config plugin to be chosen as highest priority among available
        expect(result.pluginSpec).to.equal(localCfgPluginName);
        expect(result.source).to.equal(`local '${DUMMY_LOCAL_CONFIG_FILENAME}'`);
        
        // Crucial assertion for localConfigOverrides
        expect(result.localConfigOverrides).to.deep.equal({
            header: true,
            footer: false,
            margin: { top: '1in', bottom: '0.5in', left: '0.75in' }
        });

        // Verify that relevant dependencies were called
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true;
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockPath.basename.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockProcessCwd.called).to.be.false;

        // Check console output
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${localCfgPluginName}' (determined via local '${DUMMY_LOCAL_CONFIG_FILENAME}')`);
        expect(consoleWarnStub.called).to.be.false;
    });
});
