const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'plugin create' command
createE2eTestRunner('plugin create', './plugin-create.manifest.js');
