// test/e2e/sad-paths.test.js
const { createE2eTestRunner } = require('./test-runner-factory');

// Create the test suite for sad path E2E tests
createE2eTestRunner('sad paths', './sad-paths.manifest.js');
