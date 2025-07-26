// test/integration/collections/cm-utils.test.js
require('module-alias/register');
const { cmUtilsManifestPath, cmUtilsPath, projectRoot } = require('@paths');
const manifest = require(cmUtilsManifestPath);

describe(`cm-utils (Module Integration Tests) ${path.relative(projectRoot, cmUtilsPath)}`, function() {
  manifest.forEach(scenario => {
    it(scenario.description, () => {
      scenario.assert();
    });
  });
});

