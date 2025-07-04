// test/integration/plugins/plugin-registry-builder.test.1.2.23.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.23
describe('PluginRegistryBuilder buildRegistry (1.2.23)', () => {
    it('should merge registrations from bundled, CM, and file sources in the correct order', async () => {
        // Arrange
        const mockDependencies = {
            os: { homedir: () => '/fake/home', platform: () => 'linux' },
            path: { join: (a, b) => `${a}/${b}`, dirname: () => '/fake/dir', basename: () => 'config.yaml', resolve: (p) => p },
            fs: {
                existsSync: sinon.stub().returns(true), // Assume all config files exist
                statSync: sinon.stub().returns({ isDirectory: () => true }),
                promises: { readdir: sinon.stub().resolves([]) }
            },
            process: { env: {} },
            collRoot: '/fake/coll-root'
        };
        const builder = new PluginRegistryBuilder('/fake/project', null, '/fake/project/config.yaml', false, false, null, null, mockDependencies);

        // Stub all sources to return distinct plugins, including an override
        sinon.stub(builder, '_registerBundledPlugins').resolves({ 'bundled-plugin': { sourceType: 'Bundled' }, 'override-me': { sourceType: 'Bundled' } });
        sinon.stub(builder, '_getPluginRegistrationsFromCmManifest').resolves({ 'cm-plugin': { sourceType: 'CM' }, 'override-me': { sourceType: 'CM' } });
        const getFromFileStub = sinon.stub(builder, '_getPluginRegistrationsFromFile');
        getFromFileStub.withArgs(builder.xdgGlobalConfigPath).resolves({ 'xdg-plugin': {} });
        getFromFileStub.withArgs(builder.projectManifestConfigPath).resolves({ 'project-plugin': {} });

        // Act
        const result = await builder.buildRegistry();

        // Assert
        // 1. Verify all sources were called.
        expect(builder._registerBundledPlugins.calledOnce).to.be.true;
        expect(builder._getPluginRegistrationsFromCmManifest.calledOnce).to.be.true;
        expect(getFromFileStub.calledWith(builder.xdgGlobalConfigPath)).to.be.true;
        expect(getFromFileStub.calledWith(builder.projectManifestConfigPath)).to.be.true;

        // 2. Verify the final registry has all plugins and the override was applied correctly.
        expect(result).to.have.property('bundled-plugin');
        expect(result).to.have.property('cm-plugin');
        expect(result).to.have.property('xdg-plugin');
        expect(result).to.have.property('project-plugin');
        expect(result['override-me'].sourceType).to.equal('CM'); // CM overrides Bundled
    });

    afterEach(() => {
        sinon.restore();
    });
});
