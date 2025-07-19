// test/integration/collections/cm-utils.test.js
require('module-alias/register');
const { cmUtilsManifestPath } = require('@paths');
const manifest = require(cmUtilsManifestPath);

describe('cm-utils (Module Integration Tests)', () => {
  manifest.forEach(scenario => {
    it(scenario.description, () => {
      scenario.assert();
    });
  });
});

