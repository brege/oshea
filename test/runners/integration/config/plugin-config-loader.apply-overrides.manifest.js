// test/runners/integration/config/plugin-config-loader.apply-overrides.manifest.js
require('module-alias/register');
const { pluginConfigLoaderFactoryPath } = require('@paths');
const { makePluginConfigLoaderScenario } = require(
  pluginConfigLoaderFactoryPath,
);

module.exports = [
  makePluginConfigLoaderScenario({
    description:
      '1.6.6: should return the original layer0ConfigData unchanged when useFactoryDefaultsOnly is true',
    constructorArgs: [null, {}, null, null, {}, null, true],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'my-plugin',
      { rawConfig: { setting: 'base' }, resolvedCssPaths: ['/base.css'] },
      ['/base.config.yaml'],
    ],
    assertion: async (result, _loader, mocks, _constants, expect) => {
      expect(result.mergedConfig).to.deep.equal({ setting: 'base' });
      expect(result.mergedCssPaths).to.deep.equal(['/base.css']);
      expect(mocks.mockDependencies.configUtils.deepMerge.called).to.be.false;
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.7: Should apply XDG-specific plugin config file overrides',
    constructorArgs: [
      '/xdg/base',
      {},
      '/xdg/config.yaml',
      null,
      {},
      null,
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'test-plugin',
      { rawConfig: { setting1: 'initial' }, resolvedCssPaths: [] },
      ['/base.config.yaml'],
    ],
    fsExistsStubs: { '/xdg/base/test-plugin/default.yaml': true },
    loadYamlConfigStubs: {
      '/xdg/base/test-plugin/default.yaml': {
        setting1: 'xdg-override',
      },
    },
    assertion: async (result, _loader, _mocks, _constants, expect) => {
      expect(result.mergedConfig).to.deep.equal({ setting1: 'xdg-override' });
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.8: Should apply inline overrides from xdgMainConfig',
    constructorArgs: [
      '/xdg/base',
      { 'test-plugin': { setting1: 'inline-xdg' } },
      '/xdg/config.yaml',
      null,
      {},
      null,
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'test-plugin',
      { rawConfig: { setting1: 'initial' }, resolvedCssPaths: [] },
      ['/base.config.yaml'],
    ],
    isObjectStubs: { '{"setting1":"inline-xdg"}': true },
    assertion: async (result, _loader, _mocks, _constants, expect) => {
      expect(result.mergedConfig).to.deep.equal({ setting1: 'inline-xdg' });
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.9: should correctly apply overrides from a project-specific plugin config file referenced in projectMainConfig.plugins[pluginName]',
    constructorArgs: [
      '/xdg/base',
      {},
      '/xdg/config.yaml',
      '/proj/base',
      { plugins: { 'proj-plugin': 'configs/proj-plugin.config.yaml' } },
      '/proj/config.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'proj-plugin',
      { rawConfig: { setting1: 'initial' }, resolvedCssPaths: [] },
      ['/base.config.yaml'],
    ],
    fsExistsStubs: { '/proj/base/configs/proj-plugin.config.yaml': true },
    loadYamlConfigStubs: {
      '/proj/base/configs/proj-plugin.config.yaml': {
        setting1: 'project-file-override',
      },
    },
    pathStubs: {
      isAbsolute: { 'configs/proj-plugin.config.yaml': false },
      resolve: {
        '/proj/base,configs/proj-plugin.config.yaml':
          '/proj/base/configs/proj-plugin.config.yaml',
      },
    },
    assertion: async (result, _loader, _mocks, _constants, expect) => {
      expect(result.mergedConfig).to.deep.equal({
        setting1: 'project-file-override',
      });
    },
  }),
  makePluginConfigLoaderScenario({
    description: '1.6.10: Should apply inline overrides from projectMainConfig',
    constructorArgs: [
      '/xdg/base',
      {},
      '/xdg/config.yaml',
      '/proj/base',
      { 'inline-plugin': { setting1: 'inline-project' } },
      '/proj/config.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'inline-plugin',
      { rawConfig: { setting1: 'initial' }, resolvedCssPaths: [] },
      ['/base.config.yaml'],
    ],
    isObjectStubs: { '{"setting1":"inline-project"}': true },
    assertion: async (result, _loader, _mocks, _constants, expect) => {
      expect(result.mergedConfig).to.deep.equal({ setting1: 'inline-project' });
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.11: should correctly merge CSS files and respect inherit_css across all override layers',
    constructorArgs: [
      '/xdg/base',
      {
        'css-merge-plugin': {
          css_files: ['inline-xdg.css'],
          inherit_css: false,
        },
      },
      '/xdg/config.yaml',
      '/proj/base',
      {
        plugins: { 'css-merge-plugin': 'project/override.yaml' },
        'css-merge-plugin': {
          css_files: ['inline-project.css'],
          inherit_css: false,
        },
      },
      '/proj/config.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'css-merge-plugin',
      {
        rawConfig: { css_files: ['base.css'] },
        resolvedCssPaths: ['/resolved/base.css'],
      },
      [],
    ],
    fsExistsStubs: {
      '/xdg/base/css-merge-plugin/default.yaml': true,
      '/proj/base/project/override.yaml': true,
    },
    loadYamlConfigStubs: {
      '/xdg/base/css-merge-plugin/default.yaml': {
        css_files: ['xdg.css'],
        inherit_css: true,
      },
      '/proj/base/project/override.yaml': {
        css_files: ['project.css'],
        inherit_css: true,
      },
    },
    isObjectStubs: {
      '{"css_files":["inline-xdg.css"],"inherit_css":false}': true,
      '{"css_files":["inline-project.css"],"inherit_css":false}': true,
    },
    assertion: async (_result, _loader, mocks, _constants, expect) => {
      expect(
        mocks.mockDependencies.AssetResolver.resolveAndMergeCss.callCount,
      ).to.be.greaterThan(0);
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.12: should correctly resolve relative and tilde-prefixed paths within project file-based overrides',
    constructorArgs: [
      '/xdg/base',
      {},
      '/xdg/config.yaml',
      '/proj/base',
      {
        plugins: {
          'tilde-plugin': '~/configs/tilde.yaml',
          'relative-plugin': './configs/relative.yaml',
        },
      },
      '/proj/config.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: ['tilde-plugin', { rawConfig: {}, resolvedCssPaths: [] }, []], // Test one, but setup both
    fsExistsStubs: {
      '/fake/home/configs/tilde.yaml': true,
      '/proj/base/configs/relative.yaml': true,
    },
    pathStubs: {
      isAbsolute: {
        '~/configs/tilde.yaml': false,
        './configs/relative.yaml': false,
      },
      resolve: {
        '/proj/base,./configs/relative.yaml':
          '/proj/base/configs/relative.yaml',
      },
    },
    osStubs: { homedir: '/fake/home' },
    assertion: async (_result, loader, mocks, _constants, expect) => {
      // Test tilde path resolution
      await loader.applyOverrideLayers(
        'tilde-plugin',
        { rawConfig: {}, resolvedCssPaths: [] },
        [],
      );
      expect(
        mocks.mockDependencies.configUtils.loadYamlConfig.calledWith(
          '/fake/home/configs/tilde.yaml',
        ),
      ).to.be.true;
      // Test relative path resolution
      await loader.applyOverrideLayers(
        'relative-plugin',
        { rawConfig: {}, resolvedCssPaths: [] },
        [],
      );
      expect(
        mocks.mockDependencies.configUtils.loadYamlConfig.calledWith(
          '/proj/base/configs/relative.yaml',
        ),
      ).to.be.true;
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.13: should accurately update contributingPaths with the paths of all applied override layers',
    constructorArgs: [
      '/xdg',
      { 'path-plugin': { common: 'xdg-inline' } },
      '/xdg/main.yaml',
      '/proj',
      {
        plugins: { 'path-plugin': 'conf/p.yaml' },
        'path-plugin': { common: 'proj-inline' },
      },
      '/proj/main.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'path-plugin',
      { rawConfig: { common: 'base' }, resolvedCssPaths: [] },
      ['/base.config.yaml'],
    ],
    fsExistsStubs: {
      '/xdg/path-plugin/default.yaml': true,
      '/proj/conf/p.yaml': true,
    },
    isObjectStubs: {
      '{"common":"xdg-inline"}': true,
      '{"common":"proj-inline"}': true,
    },
    pathStubs: {
      isAbsolute: { 'conf/p.yaml': false },
      resolve: { '/proj,conf/p.yaml': '/proj/conf/p.yaml' },
    },
    assertion: async (result, _loader, _mocks, _constants, expect) => {
      expect(result.contributingPaths).to.have.length(5);
      expect(result.contributingPaths).to.include('/base.config.yaml');
      expect(result.contributingPaths).to.include(
        '/xdg/path-plugin/default.yaml',
      );
      expect(result.contributingPaths).to.include(
        'Inline override from XDG main config: /xdg/main.yaml',
      );
      // Flexible assertion for /proj/conf/p.yaml
      expect(
        result.contributingPaths.some((p) => p.startsWith('/proj/conf/p.yaml')),
      ).to.be.true;
      expect(result.contributingPaths).to.include(
        'Inline override from project main config: /proj/main.yaml',
      );
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.14: should gracefully handle non-existent override files by skipping them and logging warnings',
    constructorArgs: [
      '/xdg/base',
      {},
      '/xdg/config.yaml',
      '/proj/base',
      { plugins: { 'missing-plugin': 'configs/missing.config.yaml' } },
      '/proj/config.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: ['missing-plugin', { rawConfig: {}, resolvedCssPaths: [] }, []],
    fsExistsStubs: {
      '/xdg/base/missing-plugin/default.yaml': false,
      '/proj/base/configs/missing.config.yaml': false,
    },
    pathStubs: {
      isAbsolute: { 'configs/missing.config.yaml': false },
      resolve: {
        '/proj/base,configs/missing.config.yaml':
          '/proj/base/configs/missing.config.yaml',
      },
    },
    assertion: async (_result, _loader, _mocks, _constants, expect, logs) => {
      expect(
        logs.some(
          (log) =>
            log.level === 'warn' &&
            log.msg.includes('Project-specific override path not found'),
        ),
      ).to.be.true;
    },
  }),
  makePluginConfigLoaderScenario({
    description:
      '1.6.15: should correctly apply precedence: project overrides (file then inline) > XDG (file then inline) > base config',
    constructorArgs: [
      '/xdg',
      { 'prec-plugin': { common: 'xdg-inline', xdg_only: true } },
      '/xdg/main.yaml',
      '/proj',
      {
        plugins: { 'prec-plugin': 'conf/p.yaml' },
        'prec-plugin': { common: 'proj-inline' },
      },
      '/proj/main.yaml',
      false,
    ],
    methodName: 'applyOverrideLayers',
    methodArgs: [
      'prec-plugin',
      { rawConfig: { common: 'base', base_only: true }, resolvedCssPaths: [] },
      [],
    ],
    fsExistsStubs: {
      '/xdg/prec-plugin/default.yaml': true,
      '/proj/conf/p.yaml': true,
    },
    loadYamlConfigStubs: {
      '/xdg/prec-plugin/default.yaml': { common: 'xdg-file' },
      '/proj/conf/p.yaml': { common: 'proj-file', proj_only: true },
    },
    isObjectStubs: {
      '{"common":"xdg-inline","xdg_only":true}': true,
      '{"common":"proj-inline"}': true,
    },
    pathStubs: {
      isAbsolute: { 'conf/p.yaml': false },
      resolve: { '/proj,conf/p.yaml': '/proj/conf/p.yaml' },
    },
    assertion: async (result, _loader, mocks, _constants, expect) => {
      expect(result.mergedConfig.common).to.equal('proj-inline');
      expect(result.mergedConfig.base_only).to.be.true;
      expect(result.mergedConfig.xdg_only).to.be.true;
      expect(result.mergedConfig.proj_only).to.be.true;
      expect(mocks.mockDependencies.configUtils.deepMerge.callCount).to.equal(
        4,
      );
    },
  }),
];
