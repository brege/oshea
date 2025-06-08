// test/test-cases/convert-command.test-cases.js
// Test cases for the 'md-to-pdf convert' command

const path = require('path');
const fs = require('fs'); // For fss.existsSync in preTestSetup
// readFileContent is not directly used by these specific postTestChecks,
// but yaml might be if we were parsing PDF content (which we are not here).
// const yaml = require('js-yaml'); 

// Import necessary constants
const {
    EXAMPLES_DIR,
    TEST_OUTPUT_BASE_DIR,
    TEST_DIR,
    // Any other constants used specifically by these convert tests
} = require('../test-constants');

const convertCommandTestCases = [
    {
        description: "CV: Convert example CV with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv.pdf',
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'test-cv.pdf', minSize: 1000 },
        ],
    },
    {
        description: "CV: Convert example CV",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'example-curriculum-vitae.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Cover Letter: Convert example cover letter with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cover-letter.md'),
            '--plugin', 'cover-letter', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cover-letter.pdf',
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'test-cover-letter.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Single Recipe: Convert example recipe",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-recipe.md'),
            '--plugin', 'recipe', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'example-recipe-title.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Project Config: Convert CV with project-specific config override (A5 format, custom CSS)",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'), 
            '--plugin', 'cv',
            '--config', path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'), 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv-project-override.pdf',
            '--no-open', 
        ],
        expectedOutputs: [
            { filePath: 'test-cv-project-override.pdf', minSize: 1000 }, 
        ],
        preTestSetup: async () => {
            // fss.existsSync is used here
            const testAssetConfigPath = path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'); 
            if (!fs.existsSync(testAssetConfigPath)) { 
                console.error(`ERROR: Test asset config file not found: ${testAssetConfigPath}`);
                throw new Error(`Test asset config file not found: ${testAssetConfigPath}. Make sure test assets are in place.`);
            }
            console.log(`  Using project override config: ${testAssetConfigPath}`);
        }
    },
    { 
        description: "Custom Plugin: Convert business card example using 'business-card' plugin",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-business-card.md'), 
            '--plugin', 'business-card',
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-business-card.pdf',
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'test-business-card.pdf', minSize: 500 },
        ],
    },
    {
        description: "Math Rendering: Convert example math document",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-math.md'),
            '--plugin', 'default', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'math-test-document.pdf', minSize: 1000 }, 
        ],
        postTestChecks: async (testCaseOutputDir, result) => { 
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            console.log("  INFO: Math rendering test PDF generated. For A5 format verification, visually inspect or use 'md-to-pdf config --plugin default'.");
        }
    },
    {
        description: "Params: Test with base config params & front matter override",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-params-test.md'),
            '--plugin', 'default', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'params-test-output-base.pdf', 
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'params-test-output-base.pdf', minSize: 500 }, 
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            console.log("  INFO: For full verification of 'params-test-output-base.pdf', visually inspect if KEEP_OUTPUT=true.");
            console.log("  Expected Title: Title From Base Config (then overridden by inline 'default' in test/config.test.yaml, then by front matter)");
            console.log("  Expected Author: Author From Front Matter");
            console.log("  Expected Shared Param: Value From Front Matter");
        }
    },
    {
        description: "Params: Test with project config params overriding base, & front matter overriding project",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-params-test.md'),
            '--plugin', 'default',
            '--config', path.join(TEST_DIR, 'assets', 'project_params_config.yaml'), 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'params-test-output-project.pdf', 
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'params-test-output-project.pdf', minSize: 500 }, 
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            console.log("  INFO: For full verification of 'params-test-output-project.pdf', visually inspect if KEEP_OUTPUT=true.");
            console.log("  Expected Title: Title From Project Config (then overridden by front matter)");
            console.log("  Expected Author: Author From Front Matter");
            console.log("  Expected Shared Param: Value From Front Matter");
        }
    },
];

module.exports = { testCases: convertCommandTestCases };
