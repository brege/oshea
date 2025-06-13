// test/e2e/plugin-enable.test.js
const { createE2eTestRunner } = require('./test-runner-factory.js');

createE2eTestRunner('plugin enable', './plugin-enable.manifest.js');
