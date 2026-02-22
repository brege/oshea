// test/runners/integration/config/main-config-loader.getters.manifest.js
require('module-alias/register');
const { mainConfigLoaderFactoryPath } = require('@paths');
const { makeMainConfigLoaderScenario } = require(mainConfigLoaderFactoryPath);
const path = require('node:path');

module.exports = [
  makeMainConfigLoaderScenario({
    description:
      '1.4.17: getPrimaryMainConfig() should return the correctly structured primary config object',
    constructorArgs: ['/root', null, false, null],
    fsExistsStubs: { [path.join(process.cwd(), 'config.yaml')]: true },
    loadYamlConfigStubs: {
      [path.join(process.cwd(), 'config.yaml')]: { isPrimary: true },
    },
    assertion: async (loader, _mocks, _constants, expect) => {
      const result = await loader.getPrimaryMainConfig();
      expect(result.config).to.deep.equal({
        isPrimary: true,
        projectRoot: '/root',
      });
      expect(result.path).to.equal(path.join(process.cwd(), 'config.yaml'));
      expect(result.reason).to.equal('bundled main');
    },
  }),
  makeMainConfigLoaderScenario({
    description:
      '1.4.18: getXdgMainConfig() should return the correctly structured XDG config object',
    constructorArgs: ['/root', null, false, '/xdg/config/dir'],
    fsExistsStubs: { '/xdg/config/dir/config.yaml': true },
    loadYamlConfigStubs: { '/xdg/config/dir/config.yaml': { isXdg: true } },
    assertion: async (loader, _mocks, _constants, expect) => {
      const result = await loader.getXdgMainConfig();
      expect(result.config).to.deep.equal({
        isXdg: true,
        projectRoot: '/root',
      });
      expect(result.path).to.equal('/xdg/config/dir/config.yaml');
    },
  }),
  makeMainConfigLoaderScenario({
    description:
      '1.4.19: getProjectManifestConfig() should return the correctly structured project manifest object',
    constructorArgs: ['/root', '/project/config.file', false, null],
    fsExistsStubs: { '/project/config.file': true },
    loadYamlConfigStubs: { '/project/config.file': { isProject: true } },
    assertion: async (loader, _mocks, _constants, expect) => {
      const result = await loader.getProjectManifestConfig();
      expect(result.config).to.deep.equal({
        isProject: true,
        projectRoot: '/root',
      });
      expect(result.path).to.equal('/project/config.file');
    },
  }),
];
