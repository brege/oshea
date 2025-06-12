const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'plugin validate' command
createE2eTestRunner('plugin validate', './plugin-validate.manifest.js');
