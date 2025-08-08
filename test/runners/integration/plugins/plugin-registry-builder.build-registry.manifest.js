// test/runners/integration/plugins/plugin-registry-builder.build-registry.manifest.js
require('module-alias/register');
const { pluginRegistryBuilderFactoryPath } = require('@paths');
const { makeBuildRegistryScenario, makeCacheInvalidationScenario } = require(pluginRegistryBuilderFactoryPath);
const sinon = require('sinon');

module.exports = [
  {
    description: '1.2.22: Should only load from auto-discovered plugins when useFactoryDefaultsOnly is true',
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, null, true, false, null, null],
    ...makeBuildRegistryScenario({
      registryStubs: {
        _registerBundledPlugins: { 'bundled-plugin': { sourceType: 'Bundled' } }
      },
      assertion: (result, { builderInstance }, constants, expect) => {
        expect(builderInstance._registerBundledPlugins.calledOnce).to.be.true;
        expect(builderInstance._getPluginRegistrationsFromFile.notCalled).to.be.true;
        expect(builderInstance._getPluginRegistrationsFromCmManifest.notCalled).to.be.true;
        expect(result).to.deep.equal({ 'bundled-plugin': { sourceType: 'Bundled' } });
      }
    })
  },
  {
    description: '1.2.23: Should merge registrations from bundled, CM, and file sources in the correct order',
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, '/fake/project/config.yaml', false, false, null, null],
    setup: async ({ builderInstance }) => {
      sinon.stub(builderInstance, '_registerBundledPlugins').resolves({ 'bundled-plugin': { sourceType: 'Bundled' }, 'override-me': { sourceType: 'Bundled' } });
      sinon.stub(builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({ 'cm-plugin': { sourceType: 'CM' }, 'override-me': { sourceType: 'CM' } });
      const getFromFileStub = sinon.stub(builderInstance, '_getPluginRegistrationsFromFile');
      getFromFileStub.withArgs(builderInstance.xdgGlobalConfigPath).resolves({ 'xdg-plugin': {} });
      getFromFileStub.withArgs(builderInstance.projectManifestConfigPath).resolves({ 'project-plugin': {} });
    },
    assert: async (result, { builderInstance }, constants, expect) => {
      expect(result).to.have.property('bundled-plugin');
      expect(result).to.have.property('cm-plugin');
      expect(result).to.have.property('xdg-plugin');
      expect(result).to.have.property('project-plugin');
      expect(result['override-me'].sourceType).to.equal('CM');
    }
  },
  {
    description: '1.2.24: Should return a cached registry if relevant build parameters haven\'t changed',
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, null, false, false, 'initial', null],
    setup: async ({ builderInstance }) => {
      builderInstance.buildRegistrySpy = sinon.spy(builderInstance, '_registerBundledPlugins');
      await builderInstance.buildRegistry(); // First call to cache
    },
    assert: async (result, { builderInstance }) => {
      await builderInstance.buildRegistry(); // Second call, should be cached
      expect(builderInstance.buildRegistrySpy.callCount).to.equal(1);
    }
  },
  {
    ...makeCacheInvalidationScenario({
      description: '1.2.24: Should rebuild the registry if useFactoryDefaultsOnly changes',
      changedConstructorArgs: ['/fake/project', null, null, true, false, 'initial', null]
    })
  },
  {
    ...makeCacheInvalidationScenario({
      description: '1.2.24: Should rebuild the registry if isLazyLoadMode changes',
      changedConstructorArgs: ['/fake/project', null, null, false, true, 'initial', null]
    })
  },
  {
    ...makeCacheInvalidationScenario({
      description: '1.2.24: Should rebuild the registry if primaryMainConfigLoadReason changes',
      changedConstructorArgs: ['/fake/project', null, null, false, false, 'new-reason', null]
    })
  },
  {
    ...makeCacheInvalidationScenario({
      description: '1.2.24: Should rebuild the registry if projectManifestConfigPath changes',
      changedConstructorArgs: ['/fake/project', null, '/new/path', false, false, 'initial', null]
    })
  },
  {
    ...makeCacheInvalidationScenario({
      description: '1.2.24: Should rebuild the registry if collectionsManagerInstance changes',
      changedConstructorArgs: ['/fake/project', null, null, false, false, 'initial', {}]
    })
  },
  {
    description: '1.2.25: Should include CM plugins when no CM instance is provided',
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, null, false, false, null, null],
    ...makeBuildRegistryScenario({
      registryStubs: {
        _getPluginRegistrationsFromCmManifest: { 'my-cm-plugin': {} }
      },
      assertion: (result, { builderInstance }, constants, expect) => {
        expect(builderInstance._getPluginRegistrationsFromCmManifest.calledOnce).to.be.true;
        expect(result).to.have.property('my-cm-plugin');
      }
    })
  },
  {
    description: '1.2.26: Should handle a missing factoryDefaultMainConfigPath gracefully',
    methodName: 'buildRegistry',
    constructorArgs: ['/fake/project', null, null, false, false, null, null],
    setup: async ({ builderInstance, mockDependencies }) => {
      mockDependencies.fs.existsSync.withArgs(builderInstance.xdgGlobalConfigPath).returns(false);
      mockDependencies.fs.existsSync.withArgs(builderInstance.projectManifestConfigPath).returns(false);
      builderInstance.getFromFileSpy = sinon.spy(builderInstance, '_getPluginRegistrationsFromFile');
      sinon.stub(builderInstance, '_registerBundledPlugins').resolves({});
      sinon.stub(builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({});
    },
    assert: async (result, { builderInstance }, constants, expect) => {
      expect(builderInstance.getFromFileSpy.called).to.be.false;
      expect(result).to.deep.equal({});
    }
  }
];
