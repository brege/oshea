// test/run-tests.js
const fs = require('fs').promises;
const fss = require('fs'); // Sync operations
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const yaml = require('js-yaml');

const execAsync = util.promisify(exec);

// --- Constants ---
const TEST_DIR = __dirname;
const PROJECT_ROOT = path.join(TEST_DIR, '..');
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'config.test.yaml');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');
const CLI_SCRIPT_PATH = path.join(PROJECT_ROOT, 'cli.js');

const TEST_OUTPUT_DIR_NAME = 'test_output';
const TEST_OUTPUT_BASE_DIR = path.join(TEST_DIR, TEST_OUTPUT_DIR_NAME);

const HUGO_EXAMPLE_SOURCE_IN_EXAMPLES = path.join(EXAMPLES_DIR, 'hugo-example');
// const HUGO_EXAMPLE_SOURCE_IN_TEST_OUTPUT = path.join(TEST_OUTPUT_BASE_DIR, 'hugo-example-source'); // Removed

const CREATED_PLUGINS_SUBDIR = 'created_plugins_test'; // To avoid conflict if user has 'created_plugins'
const CREATED_PLUGINS_DIR = path.join(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_SUBDIR);


// --- Test Cases ---
const testCases = [
    // --- md-to-pdf config Test Cases ---
    {
        description: "CLI: config - Display global config (implicitly uses test/config.test.yaml)",
        commandArgs: ['config'],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const normalizedTestConfigPath = path.normalize(TEST_CONFIG_PATH);
            if (!stdout.includes("# Configuration Sources:")) throw new Error("Missing '# Configuration Sources:' heading.");
            if (!stdout.includes(normalizedTestConfigPath) || !stdout.includes("(Project --config)")) throw new Error(`Stdout does not correctly show '${normalizedTestConfigPath}' as 'Project --config'. Output:\n${stdout}`);
            if (!stdout.includes("# Active Global Configuration:")) throw new Error("Missing '# Active Global Configuration:' heading.");
            if (!stdout.includes("pdf_viewer: null")) throw new Error("Missing 'pdf_viewer: null'.");
            if (!stdout.includes("title_param: Title From Base Config")) throw new Error("Missing 'params: title_param'.");
            if (!stdout.includes("default: ../plugins/default/default.config.yaml")) throw new Error("Missing default plugin registration.");
        }
    },
    {
        description: "CLI: config --pure - Display pure global config (implicitly uses test/config.test.yaml)",
        commandArgs: ['config', '--pure'],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (stdout.includes("# Configuration Sources:")) throw new Error("Found commented header in --pure output.");
            if (stdout.includes("# Note:")) throw new Error("Found note in --pure output.");
            try {
                const parsedYaml = yaml.load(stdout);
                if (parsedYaml.pdf_viewer !== null) throw new Error("Incorrect pdf_viewer in --pure output.");
                if (!parsedYaml.global_pdf_options || parsedYaml.global_pdf_options.format !== "Letter") throw new Error("Incorrect global_pdf_options.format in --pure output.");
                if (!parsedYaml.params || parsedYaml.params.title_param !== "Title From Base Config") throw new Error("Incorrect params.title_param in --pure output.");
            } catch (e) {
                throw new Error(`Failed to parse --pure output as YAML: ${e.message}\nOutput:\n${stdout}`);
            }
        }
    },
    {
        description: "CLI: config --factory-defaults - Display factory default global config",
        commandArgs: ['config', '--factory-defaults'],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const normalizedFactoryConfigPath = path.normalize(path.join(PROJECT_ROOT, 'config.example.yaml'));
            if (!stdout.includes(normalizedFactoryConfigPath) || !stdout.includes("(Factory Default:")) throw new Error(`Stdout does not show factory default config path correctly. Output:\n${stdout}`);
            if (!stdout.includes("pdf_viewer: xdg-open")) throw new Error("Missing 'pdf_viewer: xdg-open' from factory defaults.");
            if (!stdout.includes("default: ./plugins/default/default.config.yaml")) throw new Error("Missing default plugin registration from factory defaults.");
        }
    },
    {
        description: "CLI: config --plugin default - Display config for 'default' plugin",
        commandArgs: ['config', '--plugin', 'default'],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const normalizedTestConfigPath = path.normalize(TEST_CONFIG_PATH);
            const normalizedDefaultPluginConfigPath = path.normalize(path.join(PROJECT_ROOT, './plugins/default/default.config.yaml'));
            const normalizedDefaultPluginCssPath = path.normalize(path.join(PROJECT_ROOT, './plugins/default/default.css'));

            if (!stdout.includes("# Effective configuration for plugin: default")) throw new Error("Missing plugin config header.");
            if (!stdout.includes("description: Default plugin for generic Markdown documents.")) throw new Error("Missing plugin description.");
            if (!stdout.includes("format: Letter")) throw new Error("Missing merged global PDF option 'format: Letter'."); // from test/config.test.yaml
            if (!stdout.includes("# Source Information:")) throw new Error("Missing '# Source Information:' heading.");
            if (!stdout.includes(normalizedDefaultPluginConfigPath)) throw new Error(`Missing plugin's own config path '${normalizedDefaultPluginConfigPath}'.`);
            if (!stdout.includes(normalizedTestConfigPath)) throw new Error(`Missing main config path '${normalizedTestConfigPath}'.`);
            if (!stdout.includes(normalizedDefaultPluginCssPath)) throw new Error(`Missing resolved CSS path '${normalizedDefaultPluginCssPath}'.`);
        }
    },
    {
        description: "CLI: config --plugin default --pure - Display pure config for 'default' plugin",
        commandArgs: ['config', '--plugin', 'default', '--pure'],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (stdout.includes("# Effective configuration for plugin:")) throw new Error("Found commented header in --pure plugin output.");
            try {
                const parsedYaml = yaml.load(stdout);
                if (parsedYaml.description !== "Default plugin for generic Markdown documents.") throw new Error("Incorrect description in --pure plugin output.");
                if (!parsedYaml.pdf_options || parsedYaml.pdf_options.format !== "Letter") throw new Error("Incorrect pdf_options.format in --pure plugin output.");
            } catch (e) {
                throw new Error(`Failed to parse --pure plugin output as YAML: ${e.message}\nOutput:\n${stdout}`);
            }
        }
    },
    {
        description: "CLI: config --plugin cv --config <path_to_override_cv_test.yaml> - Test project-specific plugin override display",
        commandArgs: ['config', '--plugin', 'cv', '--config', path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml')],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const normalizedOverrideCvConfigPath = path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'override_cv.config.yaml'));
            const normalizedOverrideCvCssPath = path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'override_cv_style.css'));
            
            if (!stdout.includes("format: A5")) throw new Error("Missing 'format: A5' from override_cv.config.yaml.");
            if (!stdout.includes(normalizedOverrideCvConfigPath)) throw new Error(`Missing override config path '${normalizedOverrideCvConfigPath}'.`);
            if (!stdout.includes(normalizedOverrideCvCssPath)) throw new Error(`Missing overridden CSS path '${normalizedOverrideCvCssPath}'.`);
            if (!stdout.includes("description: CV Test with Project-Specific Overrides")) throw new Error("Missing overridden description.");
        }
    },    
    // --- md-to-pdf CLI Test Cases ---
    {
        description: "CV: Convert example CV with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv.pdf',
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
            '--plugin', 'cv', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
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
            '--plugin', 'cover-letter', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cover-letter.pdf',
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
            '--plugin', 'recipe', // Updated from --type
            '--outdir', TEST_OUTPUT_BASE_DIR,
        ],
        expectedOutputs: [
            { filePath: 'example-recipe-title.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Recipe Book: Create recipe book from Hugo examples",
        commandArgs: [
            'generate', // Updated from 'book'
            'recipe-book', // Plugin name
            '--recipes-base-dir', HUGO_EXAMPLE_SOURCE_IN_EXAMPLES, // Specific option for recipe-book plugin
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-recipe-book.pdf',
        ],
        expectedOutputs: [
            { filePath: 'test-recipe-book.pdf', minSize: 50000 },
        ],
    },
    {
        description: "Project Config: Convert CV with project-specific config override (A5 format, custom CSS)",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'), // Use a standard example CV markdown
            '--plugin', 'cv',
            '--config', path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'), // **** UPDATED PATH ****
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv-project-override.pdf',
            '--no-open', // Important for automated tests
        ],
        expectedOutputs: [
            // The A5 format and different margins might result in a different file size
            // compared to the default Letter/A4 CVs. Min size is a basic check.
            { filePath: 'test-cv-project-override.pdf', minSize: 1000 }, // Adjust minSize if needed
        ],
        preTestSetup: async () => {
            // Ensure the test asset directory and files exist.
            const testAssetConfigPath = path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'); // **** UPDATED PATH ****
            if (!fss.existsSync(testAssetConfigPath)) {
                // This is more of a sanity check; these files should be part of the repo.
                console.error(`ERROR: Test asset config file not found: ${testAssetConfigPath}`);
                throw new Error(`Test asset config file not found: ${testAssetConfigPath}. Make sure test assets are in place.`);
            }
            // Log that we are using specific assets for this test.
            console.log(`  Using project override config: ${testAssetConfigPath}`);
        }
    },
    { 
        description: "Custom Plugin: Convert business card example using 'business-card' plugin",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-business-card.md'), // Path to the new example markdown
            '--plugin', 'business-card',
            // Uses the default TEST_CONFIG_PATH (test/config.test.yaml) which now registers 'business-card'
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-business-card.pdf',
            '--no-open',
        ],
        expectedOutputs: [
            // Business cards are small, so minSize can be lower. Adjust if needed.
            { filePath: 'test-business-card.pdf', minSize: 500 },
        ],
        // No preTestSetup needed as files are part of the source tree
    },
    {
        description: "Math Rendering: Convert example math document",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-math.md'),
            '--plugin', 'default',
            '--outdir', TEST_OUTPUT_BASE_DIR,
            // Filename will be 'math-test-document.pdf' based on title in front matter
            '--no-open',
        ],
        expectedOutputs: [
            { filePath: 'math-test-document.pdf', minSize: 1000 }, // Adjust minSize if needed
        ],
    },
    // --- test 2-tier global params in YAML config files ---
    {
        description: "Params: Test with base config params & front matter override",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'example-params-test.md'),
            '--plugin', 'default', // Uses DefaultHandler which has the params logic
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'params-test-output-base.pdf', // Name derived from {{title}} in MD
            '--no-open',
            // Implicitly uses test/config.test.yaml, which now has a 'params' section
        ],
        expectedOutputs: [
            // Expected PDF name: "Title-From-Base-Config.pdf" (if title placeholder works)
            // For simplicity in test, we use explicit filename.
            { filePath: 'params-test-output-base.pdf', minSize: 500 }, // Adjusted minSize
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            // Manual check: PDF should show "Title From Base Config", "Author From Front Matter",
            // "Value From Front Matter" for shared_param, "Value From Base Config" for config_specific_param,
            // and "http://base.example.com" for site.url.
            console.log("  INFO: For full verification of 'params-test-output-base.pdf', visually inspect if KEEP_OUTPUT=true.");
            console.log("  Expected Title: Title From Base Config");
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
            '--config', path.join(TEST_DIR, 'assets', 'project_params_config.yaml'), // Project config with overriding params
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'params-test-output-project.pdf', // Name derived from {{title}} in MD
            '--no-open',
        ],
        expectedOutputs: [
            // Expected PDF name: "Title-From-Project-Config.pdf"
            { filePath: 'params-test-output-project.pdf', minSize: 500 }, // Adjusted minSize
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            // Manual check: PDF should show "Title From Project Config", "Author From Front Matter",
            // "Value From Front Matter" for shared_param, "Value From Project Config" for config_specific_param,
            // and "http://project.example.com" for site.url.
            console.log("  INFO: For full verification of 'params-test-output-project.pdf', visually inspect if KEEP_OUTPUT=true.");
            console.log("  Expected Title: Title From Project Config");
            console.log("  Expected Author: Author From Front Matter");
            console.log("  Expected Shared Param: Value From Front Matter");
        }
    },
    // --- md-to-pdf plugin create Test Cases ---
    {
        description: "CLI: plugin create - Basic plugin scaffolding",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR],
        expectedOutputs: [], 
        postTestChecks: async (testCaseOutputDir, result) => { 
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            if (!fss.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);

            const expectedFiles = [
                { name: 'scaffold-test1.config.yaml', contains: ["description: \"A new scaffold-test1 plugin for [purpose].\"", "handler_script: \"index.js\"", "css_files:", "- \"scaffold-test1.css\""] },
                { name: 'index.js', contains: ["class ScaffoldTest1Handler", "constructor(coreUtils)", "new coreUtils.DefaultHandler()"] },
                { name: 'scaffold-test1.css', contains: ["/* scaffold-test1/scaffold-test1.css */"] }
            ];
            for (const file of expectedFiles) {
                const filePath = path.join(pluginDir, file.name);
                await checkFile(pluginDir, file.name, 10); 
                const content = await readFileContent(filePath);
                for (const str of file.contains) {
                    if (!content.includes(str)) throw new Error(`File ${file.name} does not contain expected string: "${str}"`);
                }
            }
            if (!result.stdout || !result.stdout.includes("Plugin 'scaffold-test1' created successfully")) {
                 throw new Error(`Success message not found in stdout. Stdout: ${result.stdout}`);
            }
        }
    },
    {
        description: "CLI: plugin create - Error on existing directory without --force",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR], 
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (result.success) throw new Error("Command succeeded but should have failed (directory exists).");
            const stderr = result.stderr || result.error?.stderr || "";
            if (!stderr.includes("ERROR: Plugin directory") || !stderr.includes("already exists. Use --force to overwrite.")) {
                throw new Error(`Expected error message about existing directory not found in stderr. Stderr: ${stderr}`);
            }
        }
    },
    {
        description: "CLI: plugin create - Overwrite existing directory with --force",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR, '--force'],
        expectedOutputs: [],
        preTestSetup: async () => {
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            if (!fss.existsSync(pluginDir)) { 
                await fs.mkdir(pluginDir, { recursive: true });
            }
            await fs.writeFile(path.join(pluginDir, 'dummy.txt'), 'this should ideally be gone or ignored');
        },
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly with --force: ${result.error?.message}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            const configFilePath = path.join(pluginDir, 'scaffold-test1.config.yaml');
            await checkFile(pluginDir, 'scaffold-test1.config.yaml', 10);
            const content = await readFileContent(configFilePath);
            if (!content.includes("description: \"A new scaffold-test1 plugin for [purpose].\"")) {
                throw new Error("Config file content incorrect after --force overwrite.");
            }
            if (!result.stdout || !result.stdout.includes("Plugin 'scaffold-test1' created successfully")) {
                 throw new Error(`Success message not found in stdout for --force. Stdout: ${result.stdout}`);
            }
             if (fss.existsSync(path.join(pluginDir, 'dummy.txt'))) {
                // This is acceptable based on current scaffolder logic (overwrite files, not dir)
                console.log("  INFO: --force did not remove extraneous 'dummy.txt' file, files were overwritten.");
            }
        }
    },
    {
        description: "CLI: plugin create - Invalid plugin name (custom validation)",
        commandArgs: ['plugin', 'create', 'bad!name', '--dir', CREATED_PLUGINS_DIR], // Using 'bad!name'
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (result.success) throw new Error("Command succeeded but should have failed (invalid name).");
            const stderr = result.stderr || result.error?.stderr || "";
            // Check for the error message from plugin_scaffolder.js, matching "bad!name"
            if (!stderr.includes("ERROR: Invalid plugin name: \"bad!name\". Name must be alphanumeric and can contain hyphens, but not start/end with them.")) {
                throw new Error(`Expected custom error message about invalid plugin name "bad!name" not found in stderr. Stderr: ${stderr}`);
            }
        }
    },
    {
        description: "CLI: plugin create - With a hyphenated name",
        commandArgs: ['plugin', 'create', 'my-hyphen-plugin', '--dir', CREATED_PLUGINS_DIR],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'my-hyphen-plugin');
            if (!fss.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);
            await checkFile(pluginDir, 'my-hyphen-plugin.config.yaml', 10);
            await checkFile(pluginDir, 'index.js', 10);
            await checkFile(pluginDir, 'my-hyphen-plugin.css', 10);
            const indexContent = await readFileContent(path.join(pluginDir, 'index.js'));
            if (!indexContent.includes("class MyHyphenPluginHandler")) {
                throw new Error("Generated index.js does not have correctly cased className 'MyHyphenPluginHandler'");
            }
        }
    },
];

// --- Helper Functions ---
async function readFileContent(filePath) {
    if (!fss.existsSync(filePath)) {
        throw new Error(`File not found for content check: ${filePath}`);
    }
    return fs.readFile(filePath, 'utf8');
}

async function setupTestDirectory() {
    try {
        if (fss.existsSync(TEST_OUTPUT_BASE_DIR)) {
            console.log(`Removing existing test output directory: ${TEST_OUTPUT_BASE_DIR}`);
            await fs.rm(TEST_OUTPUT_BASE_DIR, { recursive: true, force: true });
        }
        console.log(`Creating test output directory: ${TEST_OUTPUT_BASE_DIR}`);
        await fs.mkdir(TEST_OUTPUT_BASE_DIR, { recursive: true });
        // Also ensure the dedicated dir for created plugins is made if tests rely on it existing.
        // However, plugin_scaffolder.js uses recursive:true, so it can create its base if needed.
        // For clarity, we can create it here too.
        if (!fss.existsSync(CREATED_PLUGINS_DIR)) {
            await fs.mkdir(CREATED_PLUGINS_DIR, {recursive: true});
        }

    } catch (error) {
        console.error(`Error setting up test directory: ${error.message}`);
        throw error;
    }
}

async function cleanupTestDirectory(keepOutput = false) {
    if (keepOutput) {
        console.log(`KEEP_OUTPUT is true. Skipping cleanup of ${TEST_OUTPUT_BASE_DIR}.`);
        return;
    }
    try {
        if (fss.existsSync(TEST_OUTPUT_BASE_DIR)) {
            console.log(`Cleaning up test output directory: ${TEST_OUTPUT_BASE_DIR}`);
            await fs.rm(TEST_OUTPUT_BASE_DIR, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Warning: Could not clean up test directory ${TEST_OUTPUT_BASE_DIR}: ${error.message}`);
    }
}

async function runCliCommand(argsArray) {
    const hasCustomConfig = argsArray.some(arg => arg === '--config' || arg.startsWith('--config='));
    const isPluginCommand = argsArray[0] === 'plugin'; // 'plugin create' should not get default --config
    
    let command = `node "${CLI_SCRIPT_PATH}" ${argsArray.join(' ')}`;
    
    if (!hasCustomConfig && !isPluginCommand) {
        command += ` --config "${TEST_CONFIG_PATH}"`;
    }

    console.log(`  Executing: ${command}`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_ROOT });
        if (stdout) console.log('  stdout:\n', stdout);
        const stderrContent = stderr && stderr.trim();
        if (stderrContent) {
            // Log stderr as warning, but don't fail the command *solely* on stderr content
            // unless execAsync itself throws (which it does for non-zero exit codes).
            console.warn('  stderr:\n', stderr);
        }
        return { success: true, stdout, stderr };
    } catch (error) { 
        // error object from execAsync contains stdout and stderr properties
        console.error(`  Error executing command (cli.js likely exited with error): ${error.message}`);
        if (error.stdout && error.stdout.trim()) console.error('  stdout (on error):\n', error.stdout);
        if (error.stderr && error.stderr.trim()) console.error('  stderr (on error):\n', error.stderr);
        return { success: false, error, stdout: error.stdout, stderr: error.stderr }; // Pass along stdout/stderr from error
    }
}

async function checkFile(baseDir, relativeFilePath, minSize) {
    const fullPath = path.join(baseDir, relativeFilePath);
    if (!fss.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
    }
    const stats = await fs.stat(fullPath);
    if (stats.size < minSize) {
        throw new Error(`File ${fullPath} is too small (${stats.size} bytes, expected >= ${minSize} bytes).`);
    }
    console.log(`  OK: File ${relativeFilePath} (at ${fullPath}) exists and size (${stats.size} bytes) is sufficient.`);
    return true;
}


// --- Main Test Runner ---
async function runTests() {
    let allTestsPassed = true;
    let testsRun = 0;
    let testsPassed = 0;

    const keepOutput = process.env.KEEP_OUTPUT === 'true' || process.argv.includes('--keep-output');

    try {
        await setupTestDirectory();

        for (const testCase of testCases) {
            testsRun++;
            console.log(`\nRunning test: ${testCase.description}`);
            let testCasePassed = true;

            if (testCase.preTestSetup) {
                try {
                    console.log("  Running pre-test setup...");
                    await testCase.preTestSetup();
                } catch (setupError) {
                    console.error(`  ERROR during pre-test setup: ${setupError.message}`);
                    testCasePassed = false;
                }
            }
            
            let result = { success: false, stdout: '', stderr: '', error: null };
            if(testCasePassed) { // Only run command if pre-test setup passed
                result = await runCliCommand(testCase.commandArgs);
                if (!result.success && !testCase.postTestChecks) { 
                    // If command failed AND there's no postTestCheck to validate the failure,
                    // then it's an unexpected failure.
                    // If postTestChecks exists, it's responsible for deciding if failure was expected.
                    testCasePassed = false;
                    console.error(`  RESULT: Command execution failed for: ${testCase.description}`);
                } else if (testCase.expectedOutputs && testCase.expectedOutputs.length > 0) {
                    // This block is for PDF generation tests
                    if (!result.success) { // If command failed but was expected to produce PDFs
                        testCasePassed = false;
                         console.error(`  RESULT: Command failed, cannot check expected PDF outputs for: ${testCase.description}`);
                    } else {
                        for (const expected of testCase.expectedOutputs) {
                            try {
                                await checkFile(TEST_OUTPUT_BASE_DIR, expected.filePath, expected.minSize);
                            } catch (checkError) {
                                console.error(`  RESULT: FAILED PDF check for ${expected.filePath}: ${checkError.message}`);
                                testCasePassed = false;
                            }
                        }
                    }
                }
            }

            if (testCase.postTestChecks) {
                if (testCasePassed || (!testCasePassed && result.error) ) { // Allow postTestChecks to validate expected failures
                    try {
                        console.log("  Running post-test checks...");
                        await testCase.postTestChecks(TEST_OUTPUT_BASE_DIR, result);
                         if (result.success && testCase.description.includes("Error on existing") || testCase.description.includes("Invalid plugin name")){
                            // If an error test somehow passed the command, mark test as failed.
                            // This happens if result.success was true but postTestChecks expected it to be false
                            // and didn't throw an error itself. This logic might need refinement based on how
                            // postTestChecks signals "expected failure verified".
                            // A simpler way: postTestChecks should throw if an expected failure isn't seen.
                        }
                    } catch (postCheckError) {
                        console.error(`  RESULT: FAILED post-test check: ${postCheckError.message}`);
                        if(postCheckError.stack) console.error(postCheckError.stack);
                        testCasePassed = false;
                    }
                } else if (!testCasePassed && !result.error){
                     console.error(`  SKIPPING post-test checks as pre-command steps failed for: ${testCase.description}`);
                }
            }


            if (testCasePassed) {
                console.log(`  PASSED: ${testCase.description}`);
                testsPassed++;
            } else {
                console.error(`  FAILED: ${testCase.description}`);
                allTestsPassed = false;
            }
        }
    } catch (error) {
        console.error(`\nFATAL ERROR during test execution: ${error.message}`);
        allTestsPassed = false;
    } finally {
        await cleanupTestDirectory(keepOutput);
        console.log(`\n--- Test Summary ---`);
        console.log(`Total tests run: ${testsRun}`);
        console.log(`Tests passed: ${testsPassed}`);
        console.log(`Tests failed: ${testsRun - testsPassed}`);
        if (allTestsPassed && testsRun > 0) {
            console.log("All tests passed successfully! 🎉");
            process.exit(0);
        } else {
            console.error("Some tests failed. ❌");
            process.exit(1);
        }
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { runTests };
