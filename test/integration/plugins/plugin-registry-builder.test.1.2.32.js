// test/integration/plugins/plugin-registry-builder.test.1.2.32.js
const { pluginRegistryBuilderPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const PluginRegistryBuilder = require(pluginRegistryBuilderPath);

// Test suite for Scenario 1.2.32
describe('PluginRegistryBuilder getAllPluginDetails (1.2.32)', () => {

  it('should return a list of plugins sorted alphabetically by name', async () => {
    // Arrange
    const mockDependencies = {
      os: { homedir: () => '/fake/home', platform: () => 'linux' },
      path: { join: (a, b) => `${a}/${b}`, dirname: () => '', basename: () => '' },
      fs: { existsSync: () => true, statSync: () => ({ isFile: () => true }) },
      process: { env: {} },
      loadYamlConfig: sinon.stub().resolves({}),
      // Add the mandatory collRoot dependency
      collRoot: '/fake/coll-root'
    };

    const mockCollectionsManager = {
      listAvailablePlugins: sinon.stub().resolves([
        { collection: 'cm-coll', plugin_id: 'x-plugin' },
        { collection: 'cm-coll', plugin_id: 'b-plugin' }
      ]),
      listCollections: sinon.stub().withArgs('enabled').resolves([
        { collection_name: 'cm-coll', plugin_id: 'x-plugin', invoke_name: 'x-plugin' },
        { collection_name: 'cm-coll', plugin_id: 'b-plugin', invoke_name: 'b-plugin' }
      ])
    };

    const builder = new PluginRegistryBuilder(
      '/fake/project', null, null, false, false, null,
      mockCollectionsManager,
      mockDependencies
    );

    const traditionalRegistry = {
      'zebra-plugin': { sourceType: 'Project', configPath: '...' },
      'apple-plugin': { sourceType: 'Bundled', configPath: '...' },
    };
    sinon.stub(builder, 'buildRegistry').resolves(traditionalRegistry);

    // Act
    const result = await builder.getAllPluginDetails();

    // Assert
    const names = result.map(p => p.name);

    const expectedOrder = [
      'apple-plugin',
      'b-plugin',
      'x-plugin',
      'zebra-plugin'
    ];

    expect(names).to.deep.equal(expectedOrder);
  });

  afterEach(() => {
    sinon.restore();
  });
});
