// test/e2e/plugin-validate.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

// Create the test suite for the 'plugin validate' command
createE2eTestRunner('plugin validate', './plugin-validate.manifest.js');
