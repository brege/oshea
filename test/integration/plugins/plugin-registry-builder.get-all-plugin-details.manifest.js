// test/integration/plugins/plugin-registry-builder.get-all-plugin-details.manifest.js
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
    description: '1.2.27: Should combine plugins from traditional and CM sources',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves([
          { collection: 'cm-coll', plugin_id: 'cm-plugin-1', description: 'Available CM Plugin' },
          { collection: 'cm-coll', plugin_id: 'cm-plugin-2', description: 'Plugin that will be enabled' }
        ]),
        listCollections: sinon.stub().withArgs('enabled').resolves([
          { collection_name: 'cm-coll', plugin_id: 'cm-plugin-2', invoke_name: 'enabled-plugin' }
        ])
      },
    ],
    setup: async (mocks, constants) => {
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves({
        'traditional-plugin': { sourceType: 'Bundled' }
      });
      // Mock any fs/path calls within getAllPluginDetails if needed for description loading
      mocks.mockDependencies.fs.existsSync.returns(true);
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true });
      mocks.mockDependencies.loadYamlConfig.resolves({});
      mocks.mockDependencies.path.basename.callsFake((p) => p.split('/').pop());
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('array').with.lengthOf(3);
      const names = result.map(p => p.name).sort();
      expect(names[0]).to.equal('cm-coll/cm-plugin-1');
      expect(names[1]).to.equal('enabled-plugin');
      expect(names[2]).to.equal('traditional-plugin');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.28: Should correctly retrieve and include each plugin\'s description',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves([
          { collection: 'cm-coll', plugin_id: 'cm-plugin', description: 'A Collections Manager plugin.', config_path: '/path/to/cm.config.yaml' }
        ]),
        listCollections: sinon.stub().withArgs('enabled').resolves([
          { collection_name: 'cm-coll', plugin_id: 'cm-plugin', invoke_name: 'cm-plugin', config_path: '/path/to/cm.config.yaml' }
        ])
      },
    ],
    setup: async (mocks, constants) => {
      const TRADITIONAL_CONFIG_PATH = '/path/to/traditional.config.yaml';
      const CM_CONFIG_PATH = '/path/to/cm.config.yaml';
      const CM_DESCRIPTION = 'A Collections Manager plugin.';

      mocks.mockDependencies.loadYamlConfig.withArgs(TRADITIONAL_CONFIG_PATH).resolves({ description: 'A traditional plugin.' });
      mocks.mockDependencies.fs.existsSync.returns(true); // For configPath checks
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true }); // For configPath checks
      mocks.mockDependencies.path.basename.callsFake((p) => p.split('/').pop()); // Simple basename mock

      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves({
        'traditional-plugin': { sourceType: 'Project', configPath: TRADITIONAL_CONFIG_PATH }
      });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('array').with.lengthOf(2);
      const traditionalPlugin = result.find(p => p.name === 'traditional-plugin');
      const cmPlugin = result.find(p => p.name === 'cm-plugin');
      expect(traditionalPlugin.description).to.equal('A traditional plugin.');
      expect(cmPlugin.description).to.equal('A Collections Manager plugin.');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.29: Should correctly set status and source display for traditional plugins',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { listAvailablePlugins: sinon.stub().resolves([]), listCollections: sinon.stub().resolves([]) }, // CM returns no plugins
    ],
    setup: async (mocks, constants) => {
      const traditionalRegistry = {
        'project-plugin': { sourceType: 'Project Manifest (--config)', definedIn: '/path/to/project.yaml', configPath: '...' },
        'xdg-plugin': { sourceType: 'XDG Global', definedIn: '/path/to/xdg.yaml', configPath: '...' },
        'bundled-plugin': { sourceType: 'Bundled Definitions', definedIn: '/path/to/bundled.yaml', configPath: '...' }
      };
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves(traditionalRegistry);
      mocks.mockDependencies.fs.existsSync.returns(true);
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true });
      mocks.mockDependencies.loadYamlConfig.resolves({});
      mocks.mockDependencies.path.basename.callsFake((p) => p.split('/').pop());
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('array').with.lengthOf(3);
      const projectPlugin = result.find(p => p.name === 'project-plugin');
      const xdgPlugin = result.find(p => p.name === 'xdg-plugin');
      const bundledPlugin = result.find(p => p.name === 'bundled-plugin');

      expect(projectPlugin.registrationSourceDisplay).to.equal('Project (--config: project.yaml)');
      expect(xdgPlugin.registrationSourceDisplay).to.equal('XDG (xdg.yaml)');
      expect(bundledPlugin.registrationSourceDisplay).to.equal('Bundled (bundled.yaml)');

      expect(projectPlugin.status).to.equal('Registered (Project Manifest)');
      expect(xdgPlugin.status).to.equal('Registered (XDG Global)');
      expect(bundledPlugin.status).to.equal('Registered (Bundled Definitions)');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.30: Should correctly distinguish between \'Enabled (CM)\' and \'Available (CM)\' plugins',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves([
          { collection: 'coll-1', plugin_id: 'plugin-a', description: 'Available only' },
          { collection: 'coll-1', plugin_id: 'plugin-b', description: 'Available and Enabled' }
        ]),
        listCollections: sinon.stub().withArgs('enabled').resolves([
          { collection_name: 'coll-1', plugin_id: 'plugin-b', invoke_name: 'enabled-plugin-b' }
        ])
      },
    ],
    setup: async (mocks, constants) => {
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves({}); // No traditionally registered plugins
      mocks.mockDependencies.fs.existsSync.returns(true); // For configPath checks
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true }); // For configPath checks
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('array').with.lengthOf(2);
      const availablePlugin = result.find(p => p.name === 'coll-1/plugin-a');
      const enabledPlugin = result.find(p => p.name === 'enabled-plugin-b');
      expect(availablePlugin.status).to.equal('Available (CM)');
      expect(enabledPlugin.status).to.equal('Enabled (CM)');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.31: Should handle multiple enabled instances of the same CM plugin',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves([
          { collection: 'cm-coll', plugin_id: 'multi-plugin', description: 'Multi-enabled plugin' }
        ]),
        listCollections: sinon.stub().withArgs('enabled').resolves([
          { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-one' },
          { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-two' }
        ])
      },
    ],
    setup: async (mocks, constants) => {
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves({});
      mocks.mockDependencies.fs.existsSync.returns(true);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.be.an('array').with.lengthOf(2);
      const instanceOne = result.find(p => p.name === 'instance-one');
      const instanceTwo = result.find(p => p.name === 'instance-two');
      expect(instanceOne).to.not.be.undefined;
      expect(instanceTwo).to.not.be.undefined;
      expect(instanceOne.status).to.equal('Enabled (CM)');
      expect(instanceTwo.status).to.equal('Enabled (CM)');
      expect(instanceOne.cmPluginId).to.equal('multi-plugin');
      expect(instanceTwo.cmPluginId).to.equal('multi-plugin');
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.32: Should return a list of plugins sorted alphabetically by name',
    methodName: 'getAllPluginDetails',
    constructorArgs: [
      commonTestConstants.FAKE_PROJECT_ROOT, null, null, false, false, null,
      { // mockCollectionsManager
        listAvailablePlugins: sinon.stub().resolves([
          { collection: 'cm-coll', plugin_id: 'x-plugin' },
          { collection: 'cm-coll', plugin_id: 'b-plugin' }
        ]),
        listCollections: sinon.stub().withArgs('enabled').resolves([
          { collection_name: 'cm-coll', plugin_id: 'x-plugin', invoke_name: 'x-plugin' },
          { collection_name: 'cm-coll', plugin_id: 'b-plugin', invoke_name: 'b-plugin' }
        ])
      },
    ],
    setup: async (mocks, constants) => {
      const traditionalRegistry = {
        'zebra-plugin': { sourceType: 'Project', configPath: '...' },
        'apple-plugin': { sourceType: 'Bundled', configPath: '...' },
      };
      sinon.stub(mocks.builderInstance, 'buildRegistry').resolves(traditionalRegistry);
      mocks.mockDependencies.fs.existsSync.returns(true);
      mocks.mockDependencies.fs.statSync.returns({ isFile: () => true });
      mocks.mockDependencies.loadYamlConfig.resolves({});
    },
    assert: async (result, mocks, constants, expect, logs) => {
      const names = result.map(p => p.name);
      const expectedOrder = [
        'apple-plugin',
        'b-plugin',
        'x-plugin',
        'zebra-plugin'
      ];
      expect(names).to.deep.equal(expectedOrder);
      expect(logs).to.be.empty;
    },
  },
];
