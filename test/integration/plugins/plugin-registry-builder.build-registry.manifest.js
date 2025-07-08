// test/integration/plugins/plugin-registry-builder.build-registry.manifest.js
const path = require('path');
const sinon = require('sinon');

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
};

module.exports = [
  {
    description: '1.2.22: Should only load from auto-discovered plugins when useFactoryDefaultsOnly is true',
    methodName: 'buildRegistry', // Testing the public method buildRegistry
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, true, false, null, null,
    ],
    setup: async (mocks, constants) => {
      // Stub internal methods of the builderInstance itself
      sinon.stub(mocks.builderInstance, '_registerBundledPlugins').resolves({ 'bundled-plugin': { sourceType: 'Bundled' } });
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromFile').resolves({});
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({});
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(mocks.builderInstance._registerBundledPlugins.calledOnce).to.be.true;
      expect(mocks.builderInstance._getPluginRegistrationsFromFile.notCalled).to.be.true;
      expect(mocks.builderInstance._getPluginRegistrationsFromCmManifest.notCalled).to.be.true;
      expect(result).to.have.property('bundled-plugin');
      expect(Object.keys(result).length).to.equal(1);
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.23: Should merge registrations from bundled, CM, and file sources in the correct order',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, '/fake/project/config.yaml', false, false, null, null,
    ],
    setup: async (mocks, constants) => {
      sinon.stub(mocks.builderInstance, '_registerBundledPlugins').resolves({ 'bundled-plugin': { sourceType: 'Bundled' }, 'override-me': { sourceType: 'Bundled' } });
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({ 'cm-plugin': { sourceType: 'CM' }, 'override-me': { sourceType: 'CM' } });
      const getFromFileStub = sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromFile');
      getFromFileStub.withArgs(mocks.builderInstance.xdgGlobalConfigPath).resolves({ 'xdg-plugin': {} });
      getFromFileStub.withArgs(mocks.builderInstance.projectManifestConfigPath).resolves({ 'project-plugin': {} });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(mocks.builderInstance._registerBundledPlugins.calledOnce).to.be.true;
      expect(mocks.builderInstance._getPluginRegistrationsFromCmManifest.calledOnce).to.be.true;
      expect(mocks.builderInstance._getPluginRegistrationsFromFile.calledWith(mocks.builderInstance.xdgGlobalConfigPath)).to.be.true;
      expect(mocks.builderInstance._getPluginRegistrationsFromFile.calledWith(mocks.builderInstance.projectManifestConfigPath)).to.be.true;
      expect(result).to.have.property('bundled-plugin');
      expect(result).to.have.property('cm-plugin');
      expect(result).to.have.property('xdg-plugin');
      expect(result).to.have.property('project-plugin');
      expect(result['override-me'].sourceType).to.equal('CM'); // CM overrides Bundled
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should return a cached registry if relevant build parameters haven\'t changed',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry(); // First call to cache
      expect(mocks.buildSpy.callCount).to.equal(1);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry(); // Second call, should be cached
      expect(mocks.buildSpy.callCount).to.equal(1); // Should not have increased
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should rebuild the registry if useFactoryDefaultsOnly changes',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry(); // First call to cache
      expect(mocks.buildSpy.callCount).to.equal(1);
      // Re-instantiate builder with changed parameter
      mocks.builderInstance = new (mocks.builderInstance.constructor)(
        constants.FAKE_PROJECT_ROOT, null, null, true, false, 'initial', null, mocks.mockDependencies
      );
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins'); // Spy on new instance
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry(); // Second call on new instance
      expect(mocks.buildSpy.callCount).to.be.greaterThan(0); // Should have rebuilt
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should rebuild the registry if isLazyLoadMode changes',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.equal(1);
      mocks.builderInstance = new (mocks.builderInstance.constructor)(
        constants.FAKE_PROJECT_ROOT, null, null, false, true, 'initial', null, mocks.mockDependencies
      );
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.be.greaterThan(0);
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should rebuild the registry if primaryMainConfigLoadReason changes',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.equal(1);
      mocks.builderInstance = new (mocks.builderInstance.constructor)(
        constants.FAKE_PROJECT_ROOT, null, null, false, false, 'another-reason', null, mocks.mockDependencies
      );
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.be.greaterThan(0);
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should rebuild the registry if projectManifestConfigPath changes',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.equal(1);
      mocks.builderInstance = new (mocks.builderInstance.constructor)(
        constants.FAKE_PROJECT_ROOT, null, '/new/path/config.yaml', false, false, 'initial', null, mocks.mockDependencies
      );
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.be.greaterThan(0);
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.24: Should rebuild the registry if collectionsManagerInstance changes',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', null,
    ],
    setup: async (mocks, constants) => {
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.equal(1);
      mocks.builderInstance = new (mocks.builderInstance.constructor)(
        constants.FAKE_PROJECT_ROOT, null, null, false, false, 'initial', {}, mocks.mockDependencies
      );
      mocks.buildSpy = sinon.spy(mocks.builderInstance, '_registerBundledPlugins');
    },
    assert: async (result, mocks, constants, expect, logs) => {
      await mocks.builderInstance.buildRegistry();
      expect(mocks.buildSpy.callCount).to.be.greaterThan(0);
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.25: Should include CM plugins when no CM instance is provided',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null, // collectionsManagerInstance is null
    ],
    setup: async (mocks, constants) => {
      // Stub internal methods of the builderInstance itself
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({ 'my-cm-plugin': {} });
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromFile').resolves({});
      sinon.stub(mocks.builderInstance, '_registerBundledPlugins').resolves({});
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(mocks.builderInstance._getPluginRegistrationsFromCmManifest.calledOnce).to.be.true;
      expect(result).to.have.property('my-cm-plugin');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.26: Should handle a missing factoryDefaultMainConfigPath gracefully',
    methodName: 'buildRegistry',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null, null,
    ],
    setup: async (mocks, constants) => {
      // Ensure factory default config path doesn't exist
      mocks.mockDependencies.fs.existsSync.withArgs(mocks.builderInstance.xdgGlobalConfigPath).returns(false); // Make sure this is stubbed for the XDG path
      mocks.mockDependencies.fs.existsSync.withArgs(mocks.builderInstance.projectManifestConfigPath).returns(false); // Make sure this is stubbed for the Project Manifest path
      // Spy on the method that should NOT be called
      mocks.getFromFileSpy = sinon.spy(mocks.builderInstance, '_getPluginRegistrationsFromFile');
      sinon.stub(mocks.builderInstance, '_registerBundledPlugins').resolves({}); // Prevent buildRegistry from failing before we check
      sinon.stub(mocks.builderInstance, '_getPluginRegistrationsFromCmManifest').resolves({}); // Prevent buildRegistry from failing before we check
    },
    assert: async (result, mocks, constants, expect, logs) => {
      // Verify it did not attempt to load from non-existent files
      expect(mocks.getFromFileSpy.called).to.be.false;
      expect(result).to.deep.equal({}); // Verify it returned an empty registry
      expect(logs).to.be.empty;
    },
  },
];
