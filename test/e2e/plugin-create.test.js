// test/e2e/plugin-create.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

// Create the test suite for the 'plugin create' command
createE2eTestRunner('plugin create', './plugin-create.manifest.js');
