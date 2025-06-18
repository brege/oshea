// test/integration/plugin-registry-builder/plugin-registry-builder.test.1.2.24.js
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require('../../../src/PluginRegistryBuilder');

// Test suite for Scenario 1.2.24
describe('PluginRegistryBuilder buildRegistry Caching (1.2.24)', () => {

    let mockDependencies;
    let builderInstance;
    let mockBuildRegistryInternal; // Mock the internal logic of building the registry

    beforeEach(() => {
        // Mock dependencies needed for PluginRegistryBuilder
        mockDependencies = {
            fs: {
                existsSync: sinon.stub().returns(true),
                statSync: sinon.stub().returns({ isFile: () => true, isDirectory: () => false }),
                readdirSync: sinon.stub().returns([])
            },
            fsPromises: {
                readFile: sinon.stub().resolves('{}')
            },
            path: {
                join: sinon.stub().callsFake((...args) => args.join('/')),
                resolve: sinon.stub().callsFake((...args) => args.join('/')),
                isAbsolute: sinon.stub().returns(true),
                dirname: sinon.stub().returns('/fake/dir'),
                basename: sinon.stub().returns('file.yaml'),
                extname: sinon.stub().returns('.yaml')
            },
            os: {
                homedir: sinon.stub().returns('/fake/user/home'),
                platform: sinon.stub().returns('linux')
            },
            loadYamlConfig: sinon.stub().resolves({}),
            yaml: {
                load: sinon.stub().returns({})
            },
            process: {
                env: { XDG_CONFIG_HOME: '/fake/xdg/config', ...process.env },
                cwd: sinon.stub().returns('/fake/cwd')
            }
        };

        // This mock will represent the actual heavy lifting of building the registry.
        // We'll increment a counter to ensure it's called the correct number of times.
        let registryBuildCounter = 0;
        mockBuildRegistryInternal = sinon.stub().callsFake(async () => {
            registryBuildCounter++;
            return {
                somePlugin: { configPath: `/fake/plugin/${registryBuildCounter}.config.yaml` }
            };
        });

        // Create an instance of PluginRegistryBuilder
        builderInstance = new PluginRegistryBuilder(
            '/fake/project/root',
            null,
            null,
            false, // useFactoryDefaultsOnly
            false, // isLazyLoadMode
            'initial', // primaryMainConfigLoadReason
            null,
            mockDependencies
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return a cached registry if relevant build parameters haven\'t changed', async () => {
        // Arrange
        const initialLoadYamlConfigCalls = mockDependencies.loadYamlConfig.callCount;
        const initialFsExistsSyncCalls = mockDependencies.fs.existsSync.callCount;

        const initialResult = await builderInstance.buildRegistry(); // First call

        // Act
        // Second call with unchanged parameters
        // Reset call counts of underlying dependencies to verify no new calls occur during caching
        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        const secondResult = await builderInstance.buildRegistry();

        // Assert
        // Underlying heavy lifting (yaml loading, file existence checks) should NOT be called again
        expect(mockDependencies.loadYamlConfig.callCount).to.equal(0);
        expect(mockDependencies.fs.existsSync.callCount).to.equal(0);
        // The returned object should be the same instance
        expect(secondResult).to.equal(initialResult);
    });

    it('should rebuild the registry if useFactoryDefaultsOnly changes', async () => {
        // Arrange
        await builderInstance.buildRegistry(); // First call

        // Change a parameter that should trigger a rebuild
        builderInstance.useFactoryDefaultsOnly = true;

        // Act
        // Reset call counts *before* the second call to only count calls from this second build
        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        const secondResult = await builderInstance.buildRegistry(); // Second call

        // Assert
        // Underlying heavy lifting should be called again (non-zero calls)
        expect(mockDependencies.loadYamlConfig.callCount).to.be.greaterThan(0);
        // The returned object should be a new instance (a new build)
        expect(secondResult).to.not.be.null;
    });

    it('should rebuild the registry if isLazyLoadMode changes', async () => {
        await builderInstance.buildRegistry();
        builderInstance.isLazyLoadMode = true;

        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        await builderInstance.buildRegistry();
        expect(mockDependencies.loadYamlConfig.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if primaryMainConfigLoadReason changes', async () => {
        await builderInstance.buildRegistry();
        builderInstance.primaryMainConfigLoadReason = 'another-reason';

        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        await builderInstance.buildRegistry();
        expect(mockDependencies.loadYamlConfig.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if projectManifestConfigPath changes', async () => {
        await builderInstance.buildRegistry();
        builderInstance.projectManifestConfigPath = '/new/path/config.yaml';

        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        await builderInstance.buildRegistry();
        expect(mockDependencies.loadYamlConfig.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if collectionsManagerInstance changes', async () => {
        await builderInstance.buildRegistry();
        builderInstance.collectionsManager = {}; // Simulate a different instance

        mockDependencies.loadYamlConfig.resetHistory();
        mockDependencies.fs.existsSync.resetHistory();

        await builderInstance.buildRegistry();
        expect(mockDependencies.loadYamlConfig.callCount).to.be.greaterThan(0);
    });
});
