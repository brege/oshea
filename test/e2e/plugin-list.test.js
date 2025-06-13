// test/e2e/plugin-list.test.js
const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'plugin list' command
createE2eTestRunner('plugin list', './plugin-list.manifest.js');
