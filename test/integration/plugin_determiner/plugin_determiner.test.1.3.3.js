// test/integration/plugin_determiner/plugin_determiner.test.1.3.3.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.3)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const DUMMY_MARKDOWN_FILE = '/test/path/to/third-document.md';
    const DUMMY_LOCAL_CONFIG_FILE = '/test/path/to/third-document.config.yaml';
    const DUMMY_LOCAL_CONFIG_FILENAME = 'third-document.config.yaml'; // For path.basename

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

    // Scenario 1.3.3: Verify `determinePluginToUse` correctly prioritizes a plugin
    // specified in the local `.config.yaml` file (next to the Markdown file)
    // when neither CLI nor front matter specify a plugin.
    it('1.3.3 Should prioritize local config plugin when no CLI or front matter plugin is present', async function() {
        // Arrange
        const localCfgPluginName = 'local-config-only-plugin';
        const defaultPluginName = 'default';

        const args = {
            markdownFile: DUMMY_MARKDOWN_FILE,
            // No 'plugin' property for CLI
        };

        // Mock file system to simulate existence of markdown and local config files
        mockFsSync.existsSync.withArgs(DUMMY_MARKDOWN_FILE).returns(true);
        mockFsSync.existsSync.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(true);

        // Mock readFile for markdown file to contain NO front matter plugin
        mockFsPromises.readFile.withArgs(DUMMY_MARKDOWN_FILE, 'utf8').resolves(`# Just Markdown
This has no front matter plugin.`);

        // Mock readFile for local config file to contain a plugin and an override
        mockFsPromises.readFile.withArgs(DUMMY_LOCAL_CONFIG_FILE, 'utf8').resolves(`plugin: ${localCfgPluginName}
anotherSetting: anotherValue`);

        // Mock markdownUtils.extractFrontMatter to return no plugin in data
        mockMarkdownUtils.extractFrontMatter.returns({
            data: { someOtherProp: 'value' }, // No md_to_pdf_plugin
            content: '# Just Markdown'
        });

        // Mock yaml.load to return the local config plugin and override
        mockYaml.load.returns({
            plugin: localCfgPluginName,
            anotherSetting: 'anotherValue'
        });

        // Mock path.basename for logging output related to local config file
        mockPath.basename.withArgs(DUMMY_LOCAL_CONFIG_FILE).returns(DUMMY_LOCAL_CONFIG_FILENAME);

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(localCfgPluginName);
        expect(result.source).to.equal(`local '${DUMMY_LOCAL_CONFIG_FILENAME}'`);
        expect(result.localConfigOverrides).to.deep.equal({ anotherSetting: 'anotherValue' });

        // Verify that relevant dependencies were called as expected
        expect(mockFsSync.existsSync.calledWith(DUMMY_MARKDOWN_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_MARKDOWN_FILE, 'utf8')).to.be.true;
        expect(mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;
        expect(mockFsSync.existsSync.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockFsPromises.readFile.calledWith(DUMMY_LOCAL_CONFIG_FILE, 'utf8')).to.be.true;
        expect(mockYaml.load.calledOnce).to.be.true;
        expect(mockPath.basename.calledWith(DUMMY_LOCAL_CONFIG_FILE)).to.be.true;
        expect(mockProcessCwd.called).to.be.false; // Not called as pluginSpec is not a relative path requiring CWD.

        // Check console output for the single expected INFO message
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${localCfgPluginName}' (determined via local '${DUMMY_LOCAL_CONFIG_FILENAME}')`);
        expect(consoleWarnStub.called).to.be.false; // No warnings expected.
    });
});
