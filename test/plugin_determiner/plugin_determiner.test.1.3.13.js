// test/plugin_determiner/plugin_determiner.test.1.3.13.js
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { determinePluginToUse } = require('../../src/plugin_determiner'); // Adjust path as per project structure

describe('determinePluginToUse (1.3.13)', function() {
    let mockFsPromises;
    let mockFsSync;
    let mockPath;
    let mockYaml;
    let mockMarkdownUtils;
    let mockProcessCwd;
    let dependencies;
    let consoleLogStub;
    let consoleWarnStub;

    const RELATIVE_CLI_PLUGIN_PATH = './cli-relative-plugin';
    const MOCKED_CWD = '/mock/current/working/dir';
    const EXPECTED_RESOLVED_PATH = '/mock/current/working/dir/cli-relative-plugin';

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
        mockProcessCwd = sinon.stub(); // Will be mocked for the specific scenario

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

    // Scenario 1.3.13: Verify `determinePluginToUse` correctly resolves a relative `pluginSpec`
    // against the current working directory (`process.cwd()`) if `markdownFilePathAbsolute` is not available.
    it('1.3.13 Should resolve a relative pluginSpec from CLI against process.cwd() when markdownFile is not present', async function() {
        // Arrange
        const defaultPluginName = 'default';

        const args = {
            plugin: RELATIVE_CLI_PLUGIN_PATH, // CLI plugin is a relative path
            // No 'markdownFile' property
        };

        // Mock processCwd to return a known current working directory
        mockProcessCwd.returns(MOCKED_CWD);

        // Crucial mock: resolving the relative plugin path against the CWD
        mockPath.resolve.withArgs(MOCKED_CWD, RELATIVE_CLI_PLUGIN_PATH).returns(EXPECTED_RESOLVED_PATH);

        // Act
        const result = await determinePluginToUse(args, dependencies, defaultPluginName);

        // Assertions
        expect(result.pluginSpec).to.equal(EXPECTED_RESOLVED_PATH);
        expect(result.source).to.equal('CLI option');
        expect(result.localConfigOverrides).to.be.null;

        // Verify relevant dependencies were called/not called as expected
        expect(mockFsSync.existsSync.called).to.be.false; // No markdownFile, so no existsSync calls
        expect(mockFsPromises.readFile.called).to.be.false;
        expect(mockMarkdownUtils.extractFrontMatter.called).to.be.false;
        expect(mockYaml.load.called).to.be.false;
        expect(mockProcessCwd.calledOnce).to.be.true; // Should be called for CWD resolution
        expect(mockPath.resolve.calledWith(MOCKED_CWD, RELATIVE_CLI_PLUGIN_PATH)).to.be.true; // Crucial path resolution call

        // Check console output for the single info message
        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.getCall(0).args[0]).to.include(`INFO: Using plugin '${EXPECTED_RESOLVED_PATH}' (determined via CLI option)`);
        expect(consoleWarnStub.called).to.be.false;
    });
});
