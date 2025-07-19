// test/integration/plugins/plugin-registry-builder.get-all-plugin-details.manifest.js
require('module-alias/register');
const { pluginRegistryBuilderFactoryPath } = require('@paths');
const { makeGetAllPluginDetailsScenario } = require(pluginRegistryBuilderFactoryPath);

module.exports = [
  {
    description: '1.2.27: Should combine plugins from traditional and CM sources',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      buildRegistryResult: { 'traditional-plugin': { sourceType: 'Bundled' } },
      cmAvailablePlugins: [
        { collection: 'cm-coll', plugin_id: 'cm-plugin-1', description: 'Available CM Plugin' },
        { collection: 'cm-coll', plugin_id: 'cm-plugin-2', description: 'Plugin that will be enabled' }
      ],
      cmEnabledPlugins: [{ collection_name: 'cm-coll', plugin_id: 'cm-plugin-2', invoke_name: 'enabled-plugin' }],
      assertion: (result, mocks, constants, expect) => {
        expect(result).to.be.an('array').with.lengthOf(3);
        const names = result.map(p => p.name).sort();
        expect(names).to.deep.equal(['cm-coll/cm-plugin-1', 'enabled-plugin', 'traditional-plugin']);
      }
    })
  },
  {
    description: '1.2.28: Should correctly retrieve and include each plugin\'s description',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      buildRegistryResult: { 'traditional-plugin': { sourceType: 'Project', configPath: '/path/to/traditional.config.yaml' } },
      cmAvailablePlugins: [{ collection: 'cm-coll', plugin_id: 'cm-plugin', description: 'A Collections Manager plugin.' }],
      cmEnabledPlugins: [{ collection_name: 'cm-coll', plugin_id: 'cm-plugin', invoke_name: 'cm-plugin' }],
      setup: async ({ mockDependencies }) => {
        mockDependencies.loadYamlConfig.withArgs('/path/to/traditional.config.yaml').resolves({ description: 'A traditional plugin.' });
      },
      assertion: (result, mocks, constants, expect) => {
        const traditionalPlugin = result.find(p => p.name === 'traditional-plugin');
        const cmPlugin = result.find(p => p.name === 'cm-plugin');
        expect(traditionalPlugin.description).to.equal('A traditional plugin.');
        expect(cmPlugin.description).to.equal('A Collections Manager plugin.');
      }
    })
  },
  {
    description: '1.2.29: Should correctly set status and source display for traditional plugins',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      buildRegistryResult: {
        'project-plugin': { sourceType: 'Project Manifest (--config)', definedIn: '/path/to/project.yaml' },
        'xdg-plugin': { sourceType: 'XDG Global', definedIn: '/path/to/xdg.yaml' },
        'bundled-plugin': { sourceType: 'Bundled Definitions', definedIn: '/path/to/bundled.yaml' }
      },
      assertion: (result, mocks, constants, expect) => {
        const projectPlugin = result.find(p => p.name === 'project-plugin');
        const xdgPlugin = result.find(p => p.name === 'xdg-plugin');
        const bundledPlugin = result.find(p => p.name === 'bundled-plugin');
        expect(projectPlugin.registrationSourceDisplay).to.equal('Project (--config: project.yaml)');
        expect(xdgPlugin.registrationSourceDisplay).to.equal('XDG (xdg.yaml)');
        expect(bundledPlugin.registrationSourceDisplay).to.equal('Bundled (bundled.yaml)');
        expect(projectPlugin.status).to.equal('Registered (Project Manifest)');
      }
    })
  },
  {
    description: '1.2.30: Should correctly distinguish between \'Enabled (CM)\' and \'Available (CM)\' plugins',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      cmAvailablePlugins: [
        { collection: 'coll-1', plugin_id: 'plugin-a', description: 'Available only' },
        { collection: 'coll-1', plugin_id: 'plugin-b', description: 'Available and Enabled' }
      ],
      cmEnabledPlugins: [{ collection_name: 'coll-1', plugin_id: 'plugin-b', invoke_name: 'enabled-plugin-b' }],
      assertion: (result, mocks, constants, expect) => {
        const availablePlugin = result.find(p => p.name === 'coll-1/plugin-a');
        const enabledPlugin = result.find(p => p.name === 'enabled-plugin-b');
        expect(availablePlugin.status).to.equal('Available (CM)');
        expect(enabledPlugin.status).to.equal('Enabled (CM)');
      }
    })
  },
  {
    description: '1.2.31: Should handle multiple enabled instances of the same CM plugin',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      cmAvailablePlugins: [{ collection: 'cm-coll', plugin_id: 'multi-plugin', description: 'Multi-enabled plugin' }],
      cmEnabledPlugins: [
        { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-one' },
        { collection_name: 'cm-coll', plugin_id: 'multi-plugin', invoke_name: 'instance-two' }
      ],
      assertion: (result, mocks, constants, expect) => {
        const instanceOne = result.find(p => p.name === 'instance-one');
        const instanceTwo = result.find(p => p.name === 'instance-two');
        expect(instanceOne.status).to.equal('Enabled (CM)');
        expect(instanceTwo.status).to.equal('Enabled (CM)');
      }
    })
  },
  {
    description: '1.2.32: Should return a list of plugins sorted alphabetically by name',
    methodName: 'getAllPluginDetails',
    ...makeGetAllPluginDetailsScenario({
      buildRegistryResult: {
        'zebra-plugin': { sourceType: 'Project' },
        'apple-plugin': { sourceType: 'Bundled' },
      },
      cmAvailablePlugins: [
        { collection: 'cm-coll', plugin_id: 'x-plugin' },
        { collection: 'cm-coll', plugin_id: 'b-plugin' }
      ],
      cmEnabledPlugins: [
        { collection_name: 'cm-coll', plugin_id: 'x-plugin', invoke_name: 'x-plugin' },
        { collection_name: 'cm-coll', plugin_id: 'b-plugin', invoke_name: 'b-plugin' }
      ],
      assertion: (result, mocks, constants, expect) => {
        const names = result.map(p => p.name);
        expect(names).to.deep.equal(['apple-plugin', 'b-plugin', 'x-plugin', 'zebra-plugin']);
      }
    })
  },
];
