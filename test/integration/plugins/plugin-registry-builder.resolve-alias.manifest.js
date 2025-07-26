// test/integration/plugins/plugin-registry-builder.resolve-alias.manifest.js
require('module-alias/register');
const { pluginRegistryBuilderFactoryPath } = require('@paths');
const { makeResolveAliasScenario } = require(pluginRegistryBuilderFactoryPath);
module.exports = [
  {
    description: '1.2.4: Should resolve a tilde-prefixed alias value to an absolute path in the user\'s home directory',
    methodName: '_resolveAlias',
    ...makeResolveAliasScenario({
      methodArgs: ['myAlias', '~/some/path', '/fake/config-base'],
      expectResult: path.join('/fake/home', 'some/path'),
      expectHomedirCall: true,
    }),
  },
  {
    description: '1.2.5: Should resolve a relative alias value against the provided base path',
    methodName: '_resolveAlias',
    ...makeResolveAliasScenario({
      methodArgs: ['my-alias', './relative/path', '/path/to/config/dir'],
      pathMocks: {
        isAbsolute: false,
        resolve: '/path/to/config/dir/relative/path',
      },
      expectResult: '/path/to/config/dir/relative/path',
    }),
  },
  {
    description: '1.2.6: Should return null for a null aliasValue',
    methodName: '_resolveAlias',
    ...makeResolveAliasScenario({
      methodArgs: ['my-alias', null, '/some/base'],
      expectResult: null,
      expectLogs: [/Invalid alias value for resolution/],
    }),
  },
  {
    description: '1.2.6: Should return null for an empty string aliasValue',
    methodName: '_resolveAlias',
    ...makeResolveAliasScenario({
      methodArgs: ['my-alias', '   ', '/some/base'],
      expectResult: null,
      expectLogs: [/Invalid alias value for resolution/],
    }),
  },
  {
    description: '1.2.6: Should return null for a relative path when basePathDefiningAlias is missing',
    methodName: '_resolveAlias',
    ...makeResolveAliasScenario({
      methodArgs: ['my-alias', './relative/path', null],
      pathMocks: { isAbsolute: false },
      expectResult: null,
      expectLogs: [/Cannot resolve relative alias target, base path unknown/],
    }),
  },
];
