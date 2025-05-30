// test/test-cases/generate-command.test-cases.js
// Test cases for the 'md-to-pdf generate' command

const path = require('path');

// Import necessary constants
const {
    HUGO_EXAMPLE_SOURCE_IN_EXAMPLES,
    TEST_OUTPUT_BASE_DIR,
    // Any other constants used specifically by these generate tests
} = require('../test-constants');

const generateCommandTestCases = [
    {
        description: "Recipe Book: Create recipe book from Hugo examples",
        commandArgs: [
            'generate', 
            'recipe-book', 
            '--recipes-base-dir', HUGO_EXAMPLE_SOURCE_IN_EXAMPLES, 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-recipe-book.pdf',
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'test-recipe-book.pdf', minSize: 50000 },
        ],
    },
];

module.exports = { testCases: generateCommandTestCases };
