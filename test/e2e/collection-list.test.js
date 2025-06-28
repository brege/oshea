// test/e2e/collection-list.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

// Create the test suite for the 'collection list' command
createE2eTestRunner('collection list', './collection-list.manifest.js');
