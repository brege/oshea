// test/integration/config/config-resolver.test.1.1.5.js
const { configResolverPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require(configResolverPath);

// Test suite for Scenario 1.1.5
describe('ConfigResolver getEffectiveConfig (1.1.5)', () => {

    let resolver;
    let loadBaseConfigStub;
    let mockDependencies;

    const PLUGIN_DIR_PATH = '/fake/path/to/my-plugin-dir';
    const PLUGIN_DIR_BASENAME = 'my-plugin-dir';
    const CONVENTIONAL_CONFIG_PATH = '/fake/path/to/my-plugin-dir/my-plugin-dir.config.yaml';

    beforeEach(() => {
        mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                sep: '/',
                isAbsolute: sinon.stub().returns(true),
                basename: sinon.stub().returns(PLUGIN_DIR_BASENAME),
                join: (a, b) => `${a}/${b}`,
                dirname: sinon.stub().returns(''),
                extname: sinon.stub().returns('')
            },
            fs: {
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ isDirectory: () => true, isFile: () => false }),
                readFileSync: sinon.stub().returns('{}')
            },
            deepMerge: (a, b) => ({...a, ...b})
        };

        mockDependencies.fs.existsSync.withArgs(CONVENTIONAL_CONFIG_PATH).returns(true);

        resolver = new ConfigResolver(null, false, false, mockDependencies);

        sinon.stub(resolver, '_initializeResolverIfNeeded').resolves();
        resolver.pluginConfigLoader = {
            applyOverrideLayers: sinon.stub().resolves({
                mergedConfig: { handler_script: 'index.js' },
                mergedCssPaths: []
            })
        };
        resolver.primaryMainConfig = { global_pdf_options: {}, math: {} };

        loadBaseConfigStub = sinon.stub(resolver, '_loadPluginBaseConfig').resolves({
            rawConfig: { handler_script: 'index.js' },
            resolvedCssPaths: [],
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should correctly identify the conventional config file from an absolute directory path', async () => {
        // Act
        await resolver.getEffectiveConfig(PLUGIN_DIR_PATH);

        // Assert
        expect(loadBaseConfigStub.calledOnce).to.be.true;

        const callArgs = loadBaseConfigStub.firstCall.args;
        const resolvedConfigPath = callArgs[0];
        const resolvedBasePath = callArgs[1];

        expect(resolvedBasePath).to.equal(PLUGIN_DIR_PATH);
        expect(resolvedConfigPath).to.equal(CONVENTIONAL_CONFIG_PATH);
    });
});
