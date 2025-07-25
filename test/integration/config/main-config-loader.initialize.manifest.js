// test/integration/config/main-config-loader.initialize.manifest.js
require('module-alias/register');
const { mainConfigLoaderFactoryPath } = require('@paths');
const { makeMainConfigLoaderScenario } = require(mainConfigLoaderFactoryPath);
const path = require('path');

module.exports = [
  makeMainConfigLoaderScenario({
    description: '1.4.5: Should prioritize factory defaults when useFactoryDefaultsOnly is true',
    constructorArgs: ['/root', '/cli/config.yaml', true, null],
    fsExistsStubs: { [path.join(process.cwd(), 'config.example.yaml')]: true },
    loadYamlConfigStubs: { [path.join(process.cwd(), 'config.example.yaml')]: { isFactory: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('factory default');
      expect(loader.primaryConfig).to.deep.equal({ isFactory: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.6: Should prioritize project manifest from CLI if it exists',
    constructorArgs: ['/root', '/project/md-to-pdf.config.yaml', false, null],
    fsExistsStubs: { '/project/md-to-pdf.config.yaml': true },
    loadYamlConfigStubs: { '/project/md-to-pdf.config.yaml': { isProject: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('project (from --config)');
      expect(loader.primaryConfig).to.deep.equal({ isProject: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.7: Should prioritize XDG global config if no CLI config',
    constructorArgs: ['/root', null, false, '/home/user/.config/md-to-pdf'],
    fsExistsStubs: { '/home/user/.config/md-to-pdf/config.yaml': true },
    loadYamlConfigStubs: { '/home/user/.config/md-to-pdf/config.yaml': { isXdg: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('XDG global');
      expect(loader.primaryConfig).to.deep.equal({ isXdg: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.8: Should prioritize bundled main config if no higher config found',
    constructorArgs: ['/root', null, false, '/xdg'],
    fsExistsStubs: { [path.join(process.cwd(), 'config.yaml')]: true },
    loadYamlConfigStubs: { [path.join(process.cwd(), 'config.yaml')]: { isBundled: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('bundled main');
      expect(loader.primaryConfig).to.deep.equal({ isBundled: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.9: Should fall back to factory default if no other config is found',
    constructorArgs: ['/root', null, false, '/xdg'],
    fsExistsStubs: { [path.join(process.cwd(), 'config.example.yaml')]: true },
    loadYamlConfigStubs: { [path.join(process.cwd(), 'config.example.yaml')]: { isFallback: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('factory default fallback');
      expect(loader.primaryConfig).to.deep.equal({ isFallback: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.10: Should load the selected primary config file correctly',
    constructorArgs: ['/root', null, false, null],
    fsExistsStubs: { [path.join(process.cwd(), 'config.yaml')]: true },
    loadYamlConfigStubs: { [path.join(process.cwd(), 'config.yaml')]: { isPrimary: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfigLoadReason).to.equal('bundled main');
      expect(loader.primaryConfig).to.deep.equal({ isPrimary: true });
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.11.a: Should set primaryConfig to empty object if config path does not exist',
    constructorArgs: ['/root', '/non/existent.yaml', false, null],
    fsExistsStubs: { '/non/existent.yaml': false },
    assertion: async (loader, mocks, constants, expect, logs) => {
      await loader._initialize();
      expect(loader.primaryConfig).to.deep.equal({});
      expect(loader.primaryConfigLoadReason).to.equal('factory default fallback');
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('Project manifest not found at provided path'))).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.11.b: Should set primaryConfig to empty object if config fails to load',
    constructorArgs: ['/root', '/bad/config.yaml', false, null],
    fsExistsStubs: { '/bad/config.yaml': true },
    loadYamlConfigStubs: { '/bad/config.yaml': new Error('YAML Parse Error') },
    assertion: async (loader, mocks, constants, expect, logs) => {
      await loader._initialize();
      expect(loader.primaryConfig).to.deep.equal({});
      expect(logs.some(log => log.level === 'error' && log.msg.includes('Failed to load primary main configuration'))).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.12: Should load xdgConfigContents as a secondary config',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/project/config.yaml': true, '/xdg/config.yaml': true },
    loadYamlConfigStubs: { '/project/config.yaml': { isProject: true }, '/xdg/config.yaml': { isXdg: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.primaryConfig.isProject).to.be.true;
      expect(loader.xdgConfigContents.isXdg).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.13.a: Should handle a missing secondary xdgGlobalConfigPath',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/project/config.yaml': true, '/xdg/config.yaml': false },
    loadYamlConfigStubs: { '/project/config.yaml': { isProject: true } },
    assertion: async (loader, mocks, constants, expect) => {
      await loader._initialize();
      expect(loader.xdgConfigContents).to.deep.equal({});
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.13.b: Should handle a failing secondary xdgGlobalConfigPath',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/project/config.yaml': true, '/xdg/config.yaml': true },
    loadYamlConfigStubs: {
      '/project/config.yaml': { isProject: true },
      '/xdg/config.yaml': new Error('XDG Load Error')
    },
    assertion: async (loader, mocks, constants, expect, logs) => {
      await loader._initialize();
      expect(loader.xdgConfigContents).to.deep.equal({});
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('Could not load XDG main config'))).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.14: Should load projectConfigContents as a secondary config',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/xdg/config.yaml': true, '/project/config.yaml': true },
    loadYamlConfigStubs: { '/xdg/config.yaml': { isXdg: true }, '/project/config.yaml': { isProject: true } },
    assertion: async (loader, mocks, constants, expect) => {
      // Note: Logic in module makes project primary, so this test asserts that.
      await loader._initialize();
      expect(loader.primaryConfig.isProject).to.be.true;
      expect(loader.projectConfigContents.isProject).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.15.a: Should handle a missing secondary projectManifestConfigPath',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/xdg/config.yaml': true, '/project/config.yaml': false },
    loadYamlConfigStubs: { '/xdg/config.yaml': { isXdg: true } },
    assertion: async (loader, mocks, constants, expect, logs) => {
      await loader._initialize();
      expect(loader.projectConfigContents).to.deep.equal({});
      expect(logs.some(log => log.level === 'warn' && log.msg.includes('Project manifest not found at provided path'))).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.15.b: Should handle a failing secondary projectManifestConfigPath',
    constructorArgs: ['/root', '/project/config.yaml', false, '/xdg'],
    fsExistsStubs: { '/xdg/config.yaml': true, '/project/config.yaml': true },
    loadYamlConfigStubs: {
      '/xdg/config.yaml': { isXdg: true },
      '/project/config.yaml': new Error('Project Load Error'),
    },
    assertion: async (loader, mocks, constants, expect, logs) => {
      // Since project is primary, a failure here will make both primary and projectConfigContents empty
      await loader._initialize();
      expect(loader.primaryConfig).to.deep.equal({});
      expect(loader.projectConfigContents).to.deep.equal({});
      expect(logs.some(log => log.level === 'error' && log.msg.includes('Failed to load primary main configuration'))).to.be.true;
    },
  }),
  makeMainConfigLoaderScenario({
    description: '1.4.16: Should set _initialized to true after completion',
    constructorArgs: ['/root', null, false, null],
    assertion: async (loader, mocks, constants, expect) => {
      expect(loader._initialized).to.be.false;
      await loader._initialize();
      expect(loader._initialized).to.be.true;
    },
  }),
];
