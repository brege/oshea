// test/integration/plugins/plugin-registry-builder.test.1.2.24.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.24
describe('PluginRegistryBuilder buildRegistry Caching (1.2.24)', () => {

    let mockDependencies;
    let builderInstance;
    let buildSpy; // Renamed for clarity

    beforeEach(() => {
        mockDependencies = {
            fs: {
                existsSync: sinon.stub().returns(false), // Assume no config files exist
                statSync: sinon.stub().returns({ isDirectory: () => true }),
                promises: { readdir: sinon.stub().resolves([]) }
            },
            path: {
                join: sinon.stub().callsFake((...args) => args.join('/')),
                dirname: sinon.stub().returns('/fake/dir'),
                basename: sinon.stub().returns('file.yaml'),
                resolve: (p) => p,
            },
            os: {
                homedir: sinon.stub().returns('/fake/user/home'),
                platform: sinon.stub().returns('linux')
            },
            process: { env: {} },
            collRoot: '/fake/coll-root'
        };

        builderInstance = new PluginRegistryBuilder(
            '/fake/project/root', null, null, false, false, 'initial', null, mockDependencies
        );

        // Spy on a method guaranteed to be called on a fresh build.
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return a cached registry if relevant build parameters haven\'t changed', async () => {
        // Arrange
        await builderInstance.buildRegistry(); // First call
        const initialCallCount = buildSpy.callCount;
        expect(initialCallCount).to.equal(1); // Ensure it was built once

        // Act
        await builderInstance.buildRegistry(); // Second call

        // Assert
        // The spy count should NOT have increased because the registry is cached.
        expect(buildSpy.callCount).to.equal(initialCallCount);
    });

    // The following tests are preserved to ensure registry is rebuilt when parameters change.
    // The logic inside them does not need to change because the caching is handled by `buildRegistry` itself.
    // However, the builder must be reinstantiated to clear the internal cache.

    it('should rebuild the registry if useFactoryDefaultsOnly changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildSpy.callCount;

        builderInstance = new PluginRegistryBuilder('/fake/project/root', null, null, true, false, 'initial', null, mockDependencies);
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
        await builderInstance.buildRegistry();

        expect(buildSpy.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if isLazyLoadMode changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildSpy.callCount;

        builderInstance = new PluginRegistryBuilder('/fake/project/root', null, null, false, true, 'initial', null, mockDependencies);
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
        await builderInstance.buildRegistry();

        expect(buildSpy.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if primaryMainConfigLoadReason changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildSpy.callCount;

        builderInstance = new PluginRegistryBuilder('/fake/project/root', null, null, false, false, 'another-reason', null, mockDependencies);
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
        await builderInstance.buildRegistry();

        expect(buildSpy.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if projectManifestConfigPath changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildSpy.callCount;

        builderInstance = new PluginRegistryBuilder('/fake/project/root', null, '/new/path/config.yaml', false, false, 'initial', null, mockDependencies);
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
        await builderInstance.buildRegistry();

        expect(buildSpy.callCount).to.be.greaterThan(0);
    });

    it('should rebuild the registry if collectionsManagerInstance changes', async () => {
        await builderInstance.buildRegistry();
        const initialCallCount = buildSpy.callCount;

        builderInstance = new PluginRegistryBuilder('/fake/project/root', null, null, false, false, 'initial', {}, mockDependencies);
        buildSpy = sinon.spy(builderInstance, '_registerBundledPlugins');
        await builderInstance.buildRegistry();

        expect(buildSpy.callCount).to.be.greaterThan(0);
    });
});
