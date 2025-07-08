// test/integration/plugins/plugin-registry-builder.get-plugin-registrations-from-file.manifest.js
const path = require('path');
const sinon = require('sinon'); // Needed for some stubbing in setup

const commonTestConstants = {
  FAKE_PROJECT_ROOT: '/fake/project',
  FAKE_HOME_DIR: '/fake/home',
  FAKE_MANIFEST_PATH: '/fake/project/manifest.yaml',
  FAKE_MANIFEST_DIR: '/fake/project',
  FAKE_COLL_ROOT: '/fake/coll-root',
  DUMMY_MARKDOWN_FILENAME: 'my-document.md',
  DDUMMY_PLUGIN_CONFIG_PATH: '/fake/project/plugins/my-plugin/my-plugin.config.yaml',
  DUMMY_PLUGIN_DIR: '/fake/project/plugins/my-plugin',
  DUMMY_YAML_CONTENT: 'plugins:\n  test-plugin: ./test-plugin.config.yaml',
  DUMMY_YAML_PARSED: { plugins: { 'test-plugin': './test-plugin.config.yaml' } },
  DUMMY_YAML_WITH_ALIASES: 'plugin_directory_aliases:\n  my-alias: /aliased/dir\nplugins:\n  aliased-plugin: my-alias:plugin.config.yaml',
  DUMMY_YAML_WITH_ALIASES_PARSED: { plugin_directory_aliases: { 'my-alias': '/aliased/dir' }, plugins: { 'aliased-plugin': 'my-alias:plugin.config.yaml' } },
};

module.exports = [
  {
    description: '1.2.9: Should return an empty object if the main config file does not exist',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/nonexistent/config.yaml', // mainConfigFilePath
      '/irrelevant/base/path',    // basePathForMainConfig
      'User Config'               // sourceType
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/nonexistent/config.yaml').returns(false);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.10: Should return an empty object and log an error if the config file is malformed',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/malformed/config.yaml',
      '/irrelevant/base/path',
      'User Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/malformed/config.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/malformed/config.yaml').rejects(new Error('YAML parse error'));
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('error');
      expect(logs[0].msg).to.match(/Error reading plugin registrations from '\/malformed\/config.yaml': YAML parse error/);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.11: Should correctly parse a simple config file with plugins',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/simple/config.yaml',
      '/simple',
      'User Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/simple/config.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/simple/config.yaml').resolves({
        plugins: {
          'test-plugin': './test-plugin.config.yaml'
        }
      });
      mocks.mockDependencies.path.resolve.withArgs('/simple', './test-plugin.config.yaml').returns('/simple/test-plugin.config.yaml');
      mocks.mockDependencies.fs.existsSync.withArgs('/simple/test-plugin.config.yaml').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/simple/test-plugin.config.yaml').returns({ isFile: () => true, isDirectory: () => false });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({
        'test-plugin': {
          configPath: '/simple/test-plugin.config.yaml',
          definedIn: '/simple/config.yaml',
          sourceType: 'User Config'
        }
      });
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.12: Should handle plugin definitions with aliases',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/with/aliases.yaml',
      '/config/with',
      'Aliased Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/with/aliases.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/with/aliases.yaml').resolves({
        plugin_directory_aliases: {
          'my-alias': '/aliased/dir'
        },
        plugins: {
          'aliased-plugin': 'my-alias:plugin.config.yaml'
        }
      });
      // Mock _resolveAlias correctly
      mocks.mockDependencies.os.homedir.returns('/fake/home'); // Needed for _resolveAlias internal logic
      mocks.mockDependencies.path.join.callsFake(require('path').join);
      mocks.mockDependencies.path.resolve.callsFake(require('path').resolve);
      mocks.mockDependencies.path.isAbsolute.callsFake((p) => require('path').isAbsolute(p));

      // Specific mocks for _resolveAlias calls from _getPluginRegistrationsFromFile
      // Mocks for alias resolution inside _resolveAlias
      mocks.mockDependencies.path.resolve.withArgs('/config/with', '/aliased/dir').returns('/config/with/aliased/dir');

      // Mocks for _resolvePluginConfigPath call from _getPluginRegistrationsFromFile
      // Simulating: path.join('/aliased/dir', 'plugin.config.yaml')
      mocks.mockDependencies.fs.existsSync.withArgs('/aliased/dir/plugin.config.yaml').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/aliased/dir/plugin.config.yaml').returns({ isFile: () => true });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({
        'aliased-plugin': {
          configPath: '/aliased/dir/plugin.config.yaml',
          definedIn: '/config/with/aliases.yaml',
          sourceType: 'Aliased Config'
        }
      });
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.13: Should skip registration for plugins with unresolved aliases and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/unresolved/alias.yaml',
      '/config/unresolved',
      'Warn Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/unresolved/alias.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/unresolved/alias.yaml').resolves({
        plugin_directory_aliases: {
          'bad-alias': null // Malformed alias that _resolveAlias would return null for
        },
        plugins: {
          'bad-plugin': 'bad-alias:plugin.config.yaml'
        }
      });
      mocks.mockDependencies.os.homedir.returns('/fake/home'); // Ensure homedir is available for _resolveAlias
      mocks.mockDependencies.path.join.callsFake(require('path').join);
      mocks.mockDependencies.path.resolve.callsFake(require('path').resolve);
      mocks.mockDependencies.path.isAbsolute.callsFake(require('path').isAbsolute);

      mocks.mockDependencies.fs.existsSync.withArgs('/config/unresolved/bad-alias:plugin.config.yaml').returns(false);
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Plugin configuration path 'bad-alias:plugin.config.yaml' \(resolved to '\/config\/unresolved\/bad-alias:plugin.config.yaml'\) does not exist\. Skipping registration for this entry\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.14: Should skip registration for plugin paths that do not exist or are not files and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/nonexistent/plugin.yaml',
      '/config/nonexistent',
      'Nonexistent Plugin Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/nonexistent/plugin.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/nonexistent/plugin.yaml').resolves({
        plugins: {
          'nonexistent-plugin': './nonexistent-plugin.config.yaml'
        }
      });
      mocks.mockDependencies.path.resolve.withArgs('/config/nonexistent', './nonexistent-plugin.config.yaml').returns('/config/nonexistent/nonexistent-plugin.config.yaml');
      mocks.mockDependencies.fs.existsSync.withArgs('/config/nonexistent/nonexistent-plugin.config.yaml').returns(false); // Simulate non-existent file
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Plugin configuration path '.\/nonexistent-plugin.config.yaml' \(resolved to '\/config\/nonexistent\/nonexistent-plugin.config.yaml'\) does not exist\. Skipping registration for this entry\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.15: Should skip registration for plugin directories without a suitable config file and log a warning',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/bad-dir/plugin.yaml',
      '/config/bad-dir',
      'Bad Dir Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/bad-dir/plugin.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/bad-dir/plugin.yaml').resolves({
        plugins: {
          'bad-dir-plugin': './bad-plugin-dir' // Path pointing to a directory
        }
      });
      mocks.mockDependencies.path.resolve.withArgs('/config/bad-dir', './bad-plugin-dir').returns('/config/bad-dir/bad-plugin-dir');
      mocks.mockDependencies.fs.existsSync.withArgs('/config/bad-dir/bad-plugin-dir').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/config/bad-dir/bad-plugin-dir').returns({ isFile: () => false, isDirectory: () => true });
      mocks.mockDependencies.path.basename.withArgs('/config/bad-dir/bad-plugin-dir').returns('bad-plugin-dir');
      mocks.mockDependencies.fs.existsSync.withArgs('/config/bad-dir/bad-plugin-dir/bad-plugin-dir.config.yaml').returns(false); // No conventional config
      mocks.mockDependencies.fs.readdirSync.withArgs('/config/bad-dir/bad-plugin-dir').returns(['other-file.txt', 'another-dir']); // No alternative config
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('warn');
      expect(logs[0].msg).to.match(/Plugin configuration path '.\/bad-plugin-dir' \(resolved to directory '\/config\/bad-dir\/bad-plugin-dir'\) does not contain a suitable \*\.config\.yaml file\. Skipping registration\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.16: Should log INFO when using an alternative config file within a plugin directory',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/alt-dir/plugin.yaml',
      '/config/alt-dir',
      'Alt Dir Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/alt-dir/plugin.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/alt-dir/plugin.yaml').resolves({
        plugins: {
          'alt-plugin': './alt-plugin-dir'
        }
      });
      mocks.mockDependencies.path.resolve.withArgs('/config/alt-dir', './alt-plugin-dir').returns('/config/alt-dir/alt-plugin-dir');
      mocks.mockDependencies.fs.existsSync.withArgs('/config/alt-dir/alt-plugin-dir').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/config/alt-dir/alt-plugin-dir').returns({ isFile: () => false, isDirectory: () => true });
      mocks.mockDependencies.path.basename.withArgs('/config/alt-dir/alt-plugin-dir').returns('alt-plugin-dir');
      mocks.mockDependencies.fs.existsSync.withArgs('/config/alt-dir/alt-plugin-dir/alt-plugin-dir.config.yaml').returns(false);
      mocks.mockDependencies.fs.readdirSync.withArgs('/config/alt-dir/alt-plugin-dir').returns(['alt.config.yaml', 'other-file.txt']);
      mocks.mockDependencies.fs.existsSync.withArgs('/config/alt-dir/alt-plugin-dir/alt.config.yaml').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/config/alt-dir/alt.config.yaml').returns({ isFile: () => true });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({
        'alt-plugin': {
          configPath: '/config/alt-dir/alt-plugin-dir/alt.config.yaml',
          definedIn: '/config/alt-dir/plugin.yaml',
          sourceType: 'Alt Dir Config'
        }
      });
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].level).to.equal('info');
      expect(logs[0].msg).to.match(/Using 'alt.config.yaml' as config for plugin directory specified by '.\/alt-plugin-dir' \(resolved to '\/config\/alt-dir\/alt-plugin-dir'\)\./);
      expect(logs[0].meta).to.deep.include({ module: 'plugins/PluginRegistryBuilder' });
    },
  },
  {
    description: '1.2.17: Should handle plugin aliases defined in the main config file',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/with-aliases-only/plugin.yaml',
      '/config/with-aliases-only',
      'Aliases Only Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/with-aliases-only/plugin.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/with-aliases-only/plugin.yaml').resolves({
        plugin_directory_aliases: {
          'my-alias': '/custom/path/to/plugins'
        },
        plugins: {
          'test-plugin': 'my-alias:plugin.config.yaml'
        }
      });
      mocks.mockDependencies.os.homedir.returns('/fake/home');
      mocks.mockDependencies.path.join.callsFake(require('path').join);
      mocks.mockDependencies.path.resolve.callsFake(require('path').resolve);
      mocks.mockDependencies.path.isAbsolute.callsFake(require('path').isAbsolute);

      mocks.mockDependencies.fs.existsSync.withArgs('/custom/path/to/plugins/plugin.config.yaml').returns(true);
      mocks.mockDependencies.fs.statSync.withArgs('/custom/path/to/plugins/plugin.config.yaml').returns({ isFile: () => true });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({
        'test-plugin': {
          configPath: '/custom/path/to/plugins/plugin.config.yaml',
          definedIn: '/config/with-aliases-only/plugin.yaml',
          sourceType: 'Aliases Only Config'
        }
      });
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.18: Should return empty registrations if no plugins section exists',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/no-plugins-section/config.yaml',
      '/irrelevant/base/path',
      'No Plugins Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/no-plugins-section/config.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/no-plugins-section/config.yaml').resolves({
        someOtherSetting: true
      });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.be.empty;
    },
  },
  {
    description: '1.2.19: Should return empty registrations if plugins section is empty',
    methodName: '_getPluginRegistrationsFromFile',
    methodArgs: [
      '/config/empty-plugins-section/config.yaml',
      '/irrelevant/base/path',
      'Empty Plugins Config'
    ],
    setup: async (mocks, constants) => {
      mocks.mockDependencies.fs.existsSync.withArgs('/config/empty-plugins-section/config.yaml').returns(true);
      mocks.mockDependencies.loadYamlConfig.withArgs('/config/empty-plugins-section/config.yaml').resolves({
        plugins: {}
      });
    },
    assert: async (result, mocks, constants, expect, logs) => {
      expect(result).to.deep.equal({});
      expect(logs).to.be.empty;
    },
  },
];
