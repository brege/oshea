// test/e2e/config.test.js
const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'config' command
createE2eTestRunner('config', './config.manifest.js');
