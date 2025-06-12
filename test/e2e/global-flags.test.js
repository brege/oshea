const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for global flags
createE2eTestRunner('global flags', './global-flags.manifest.js');
