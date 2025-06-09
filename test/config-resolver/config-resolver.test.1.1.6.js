// test/config-resolver/config-resolver.test.1.1.6.js
const { expect } = require('chai');
const sinon = require('sinon');
const ConfigResolver = require('../../src/ConfigResolver');

// Test suite for Scenario 1.1.6
describe('ConfigResolver getEffectiveConfig (1.1.6)', () => {

    let resolver;
    let loadBaseConfigStub;

    const PLUGIN_CONFIG_FILE_PATH = '/fake/path/to/my-plugin/my-plugin.config.yaml';
    const PLUGIN_BASE_PATH = '/fake/path/to/my-plugin';

    beforeEach(() => {
        const mockDependencies = {
            path: {
                resolve: sinon.stub().returnsArg(0),
                sep: '/',
                isAbsolute: sinon.stub().returns(true),
                dirname: sinon.stub().returns(PLUGIN_BASE_PATH),
                basename: sinon.stub().returns('my-plugin'),
                extname: sinon.stub().returns('.yaml'),
                // FIX: Added path.join
                join: (...args) => args.join('/')
            },
            fs: {
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ isDirectory: () => false, isFile: () => true }),
                // FIX: Added fs.readFileSync
                readFileSync: sinon.stub().returns('{}')
            },
            deepMerge: (a, b) => ({...a, ...b})
        };

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

    it('should correctly handle a plugin specified by an absolute file path', async () => {
        // Act
        await resolver.getEffectiveConfig(PLUGIN_CONFIG_FILE_PATH);

        // Assert
        expect(loadBaseConfigStub.calledOnce).to.be.true;

        const callArgs = loadBaseConfigStub.firstCall.args;
        const resolvedConfigPath = callArgs[0];
        const resolvedBasePath = callArgs[1];

        expect(resolvedConfigPath).to.equal(PLUGIN_CONFIG_FILE_PATH);
        expect(resolvedBasePath).to.equal(PLUGIN_BASE_PATH);
    });
});
