// test/integration/plugins/plugin-registry-builder.test.1.2.24.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.24
describe('PluginRegistryBuilder buildRegistry Caching (1.2.24)', () => {

    let mockDependencies;
    let builderInstance;
    let buildRegistrySpy;

    beforeEach(() => {
        mockDependencies = {
            fs: { existsSync: sinon.stub().returns(true) },
            path: {
                join: sinon.stub().callsFake((...args) => args.join('/')),
                dirname: sinon.stub().returns('/fake/dir'),
                basename: sinon.stub().returns('file.yaml'),
            },
            os: {
                homedir: sinon.stub().returns('/fake/user/home'),
                platform: sinon.stub().returns('linux')
            },
            process: { env: {} },
            // Add the mandatory collRoot dependency
            collRoot: '/fake/coll-root'
        };

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

        // Spy on the methods that do the actual work inside buildRegistry
        buildRegistrySpy = sinon.spy(builderInstance, '_getPluginRegistrationsFromFile');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return a cached registry if relevant build parameters haven\'t changed', async () => {
        // Arrange
        await builderInstance.buildRegistry(); // First call
        const initialCallCount = buildRegistrySpy.callCount;
        expect(initialCallCount).to.be.greaterThan(0); // Ensure it was built at least once

        // Act
        await builderInstance.buildRegistry(); // Second call

        // Assert
        // The spy count should NOT have increased
        expect(buildRegistrySpy.callCount).to.equal(initialCallCount);
    });

    it('should rebuild the registry if useFactoryDefaultsOnly changes', async () => {
        // Arrange
        await builderInstance.buildRegistry(); // First call
        const initialCallCount = buildRegistrySpy.callCount;

        // Act
        builderInstance.useFactoryDefaultsOnly = true;
        await builderInstance.buildRegistry(); // Second call

        // Assert
        expect(buildRegistrySpy.callCount).to.be.greaterThan(initialCallCount);
    });

    it('should rebuild the registry if isLazyLoadMode changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildRegistrySpy.callCount;
        builderInstance.isLazyLoadMode = true;
        await builderInstance.buildRegistry();
        expect(buildRegistrySpy.callCount).to.be.greaterThan(initialCallCount);
    });

    it('should rebuild the registry if primaryMainConfigLoadReason changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildRegistrySpy.callCount;
        builderInstance.primaryMainConfigLoadReason = 'another-reason';
        await builderInstance.buildRegistry();
        expect(buildRegistrySpy.callCount).to.be.greaterThan(initialCallCount);
    });

    it('should rebuild the registry if projectManifestConfigPath changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildRegistrySpy.callCount;
        builderInstance.projectManifestConfigPath = '/new/path/config.yaml';
        await builderInstance.buildRegistry();
        expect(buildRegistrySpy.callCount).to.be.greaterThan(initialCallCount);
    });

    it('should rebuild the registry if collectionsManagerInstance changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildRegistrySpy.callCount;
        builderInstance.collectionsManager = {}; // Simulate a different instance
        await builderInstance.buildRegistry();
        expect(buildRegistrySpy.callCount).to.be.greaterThan(initialCallCount);
    });
});
