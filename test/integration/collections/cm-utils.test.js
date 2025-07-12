// test/integration/collections/cm-utils.test.js
const manifest = require('./cm-utils.manifest.js');

describe('cm-utils (Module Integration Tests)', () => {
  manifest.forEach(scenario => {
    it(scenario.description, () => {
      scenario.assert();
    });
  });
});
