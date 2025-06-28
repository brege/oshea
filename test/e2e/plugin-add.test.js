// test/e2e/plugin-add.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

createE2eTestRunner('plugin add', './plugin-add.manifest.js');
