// test/integration/plugins/plugin-registry-builder.resolve-plugin-config-path.manifest.js
const { makeResolveConfigPathScenario } = require('../../shared/case-factories');
const path = require('path');

module.exports = [
  {
    description: '1.2.7: Should correctly resolve an alias-prefixed raw path',
    methodName: '_resolvePluginConfigPath',
    ...makeResolveConfigPathScenario({
      methodArgs: ['my-alias:plugin-dir/plugin.config.yaml', '/irrelevant/base/path', { 'my-alias': '/path/to/aliased/dir' }],
      fileSystem: {
        '/path/to/aliased/dir/plugin-dir/plugin.config.yaml': { exists: true, isFile: true }
      },
      expectResult: '/path/to/aliased/dir/plugin-dir/plugin.config.yaml',
    }),
  },
  {
    description: '1.2.8: Should resolve a tilde-prefixed raw path to an absolute path in the user\'s home directory',
    methodName: '_resolvePluginConfigPath',
    ...makeResolveConfigPathScenario({
      methodArgs: ['~/my-plugin'],
      fileSystem: {
        '~/my-plugin': { exists: true, isFile: true }
      },
      expectResult: path.join('/fake/home', 'my-plugin'),
      expectHomedirCall: true,
    }),
  }
];

