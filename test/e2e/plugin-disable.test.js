// test/e2e/plugin-disable.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

createE2eTestRunner('plugin disable', './plugin-disable.manifest.js');
