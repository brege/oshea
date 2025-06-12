const { createE2eTestRunner } = require('./test-runner-factory.js');

// Create the test suite for the 'collection add' command
createE2eTestRunner('collection add', './collection-add.manifest.js');
