// test/e2e/collection-update.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

// Create the test suite for the 'collection update' command
createE2eTestRunner('collection update', './collection-update.manifest.js');
