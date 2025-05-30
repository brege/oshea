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

const CREATED_PLUGINS_SUBDIR = 'created_plugins_test'; 
const CREATED_PLUGINS_DIR = path.join(TEST_OUTPUT_BASE_DIR, CREATED_PLUGINS_SUBDIR);

const FM_CV_SPEC_MD_PATH = path.join(TEST_DIR, 'assets', 'front_matter_tests', 'fm_specifies_cv.md');
const LOCAL_CONFIG_DOC_MD_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'doc_with_local_config.md');
const LOCAL_CONFIG_DOC_YAML_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'doc_with_local_config.config.yaml'); // For verification checks if needed
const LOCAL_CONFIG_DOC_CSS_PATH = path.join(TEST_DIR, 'assets', 'local_config_tests', 'local_test_style.css'); // For verification checks if needed


// --- Test Cases ---
const testCases = [
    // --- md-to-pdf config Test Cases ---
    {
        description: "CLI: config - Display global config (explicitly using test/config.test.yaml)", // Modified description
        commandArgs: ['config', '--config', TEST_CONFIG_PATH], // Explicitly add --config
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
            if (!stdout.includes("plugins:")) throw new Error("Missing 'plugins:' section header.");
            if (!stdout.includes("default: ../plugins/default/default.config.yaml")) throw new Error("Missing default plugin registration under 'plugins'.");
            if (!stdout.includes("description: Test Override for Default Plugin")) throw new Error("Missing inline override 'default:' block's description.");
        }
    },
    {
        description: "CLI: config --pure - Display pure global config (explicitly using test/config.test.yaml)", // Modified description
        commandArgs: ['config', '--pure', '--config', TEST_CONFIG_PATH], // Explicitly add --config
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
                if (!parsedYaml.plugins || !parsedYaml.plugins.default) throw new Error("Missing 'plugins.default' registration in --pure output.");
                if (!parsedYaml.default || parsedYaml.default.description !== "Test Override for Default Plugin") throw new Error("Missing or incorrect inline override 'default.description' in --pure output.");
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
            if (!stdout.includes("plugins:")) throw new Error("Missing 'plugins:' section in factory defaults output.");
            if (!stdout.includes("default: ./plugins/default/default.config.yaml")) throw new Error("Missing default plugin registration from factory defaults 'plugins' key.");
        }
    },
    {
        description: "CLI: config --plugin default - Display config for 'default' plugin with inline override",
        commandArgs: ['config', '--plugin', 'default', '--config', TEST_CONFIG_PATH],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const normalizedTestConfigPath = path.normalize(TEST_CONFIG_PATH);
            const normalizedDefaultPluginConfigPath = path.normalize(path.join(PROJECT_ROOT, './plugins/default/default.config.yaml'));
            const normalizedDefaultPluginCssPath = path.normalize(path.join(PROJECT_ROOT, './plugins/default/default.css'));

            if (!stdout.includes("# Effective configuration for plugin: default")) throw new Error("Missing plugin config header.");
            if (!stdout.includes("description: Test Override for Default Plugin")) throw new Error("Missing overridden plugin description 'Test Override for Default Plugin'.");
            if (!stdout.includes("format: A5")) throw new Error("Missing overridden PDF option 'format: A5'.");
            if (!stdout.includes("top: 0.5in")) throw new Error("Missing overridden PDF margin top '0.5in'.");
            if (!stdout.includes("# Source Information:")) throw new Error("Missing '# Source Information:' heading.");
            if (!stdout.includes(normalizedDefaultPluginConfigPath)) throw new Error(`Missing plugin's own config path '${normalizedDefaultPluginConfigPath}'.`);
            if (!stdout.includes(normalizedTestConfigPath)) throw new Error(`Missing main config path '${normalizedTestConfigPath}'.`);
            if (!stdout.includes(normalizedDefaultPluginCssPath)) throw new Error(`Missing resolved CSS path '${normalizedDefaultPluginCssPath}'.`);
            if (!stdout.includes(`Inline override from project main config: ${normalizedTestConfigPath}`)) throw new Error("Missing source info for inline project override.");
        }
    },
    {
        description: "CLI: config --plugin default --pure - Display pure config for 'default' plugin with inline override",
        commandArgs: ['config', '--plugin', 'default', '--pure', '--config', TEST_CONFIG_PATH],
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (stdout.includes("# Effective configuration for plugin:")) throw new Error("Found commented header in --pure plugin output.");
            try {
                const parsedYaml = yaml.load(stdout);
                if (parsedYaml.description !== "Test Override for Default Plugin") throw new Error(`Incorrect overridden description in --pure plugin output. Expected 'Test Override for Default Plugin', got '${parsedYaml.description}'.`);
                if (!parsedYaml.pdf_options || parsedYaml.pdf_options.format !== "A5") throw new Error(`Incorrect overridden pdf_options.format in --pure plugin output. Expected 'A5', got '${parsedYaml.pdf_options?.format}'.`);
                if (!parsedYaml.pdf_options.margin || parsedYaml.pdf_options.margin.top !== "0.5in") throw new Error(`Incorrect overridden pdf_options.margin.top in --pure plugin output. Expected '0.5in', got '${parsedYaml.pdf_options?.margin?.top}'.`);
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
            // const normalizedProjectOverrideConfigPath = path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'override_cv.config.yaml')); // OLD check
            const expectedOverrideSourceString = `Inline override from project main config: ${path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'))}`; // NEW check for inline override source
            const normalizedProjectOverrideCssPath = path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'override_cv_style.css'));
            
            if (!stdout.includes("description: CV Test with Project-Specific Overrides (e.g., A5 format, green theme)")) throw new Error("Missing overridden description from cv_test.yaml's inline override.");
            if (!stdout.includes("format: A5")) throw new Error("Missing 'format: A5' from cv_test.yaml's inline override.");
            
            // Check if the "Contributing Configuration Files" section lists the cv_test.yaml as the source of an inline override for the project.
            if (!stdout.includes(expectedOverrideSourceString)) throw new Error(`Missing expected source string for inline override: '${expectedOverrideSourceString}'. Check 'Contributing Configuration Files' in output. Full stdout:\n${stdout}`);
            
            if (!stdout.includes(normalizedProjectOverrideCssPath)) throw new Error(`Missing overridden CSS path '${normalizedProjectOverrideCssPath}'.`);
        }
    },   
    // --- md-to-pdf CLI Test Cases ---
    {
        description: "CV: Convert example CV with explicit filename",
        commandArgs: [
            'convert',
            path.join(EXAMPLES_DIR, 'example-cv.md'),
            '--plugin', 'cv', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-cv.pdf',
            '--no-open', // Added
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
            '--no-open', // Added
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
            '--no-open', // Added
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
            '--no-open', // Added
        ],
        expectedOutputs: [
            { filePath: 'example-recipe-title.pdf', minSize: 1000 },
        ],
    },
    {
        description: "Recipe Book: Create recipe book from Hugo examples",
        commandArgs: [
            'generate', 
            'recipe-book', 
            '--recipes-base-dir', HUGO_EXAMPLE_SOURCE_IN_EXAMPLES, 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-recipe-book.pdf',
            '--no-open', // Added
        ],
        expectedOutputs: [
            { filePath: 'test-recipe-book.pdf', minSize: 50000 },
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
            const testAssetConfigPath = path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'); 
            if (!fss.existsSync(testAssetConfigPath)) {
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
                { name: 'scaffold-test1.css', contains: ["/* scaffold-test1/scaffold-test1.css */"] },
                { name: 'README.md', contains: ["Plugin: scaffold-test1", "cli_help: |"] }
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
             if (!result.stdout.includes("Register your new plugin in a main config.yaml's 'plugins' section:")) { 
                throw new Error("Plugin create success message does not mention 'plugins' key for registration.");
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
                console.log("  INFO: --force did not remove extraneous 'dummy.txt' file, files were overwritten.");
            }
        }
    },
    {
        description: "CLI: plugin create - Invalid plugin name (custom validation)",
        commandArgs: ['plugin', 'create', 'bad!name', '--dir', CREATED_PLUGINS_DIR], 
        expectedOutputs: [],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (result.success) throw new Error("Command succeeded but should have failed (invalid name).");
            const stderr = result.stderr || result.error?.stderr || "";
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
    // --- Lazy Load Tests ---
    {
        description: "Front Matter: Convert document specifying 'cv' plugin in front matter",
        commandArgs: [
            // Using explicit convert command first for simplicity, 
            // can add a separate test for lazy load if needed.
            'convert', 
            path.join(TEST_DIR, 'assets', 'test-fm-plugin.md'),
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-fm-plugin-cv-output.pdf',
            '--no-open' 
            // No --plugin flag here, so it should pick up from front matter
        ],
        preTestSetup: async () => {
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            const fmPluginTestMdContent = `---
title: "FM Plugin Test Doc"
md_to_pdf_plugin: "cv"
---

# Document Title Should Be Handled by CV Plugin

This document explicitly requests the 'cv' plugin via front matter.`;
            await fs.writeFile(fmPluginTestMdPath, fmPluginTestMdContent);
            console.log(`  Created test file: ${fmPluginTestMdPath}`);
        },
        expectedOutputs: [
            { filePath: 'test-fm-plugin-cv-output.pdf', minSize: 1000 }, // Basic check for PDF generation
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            // Check if the log indicates 'cv' plugin was used due to front matter
            if (!stdout.includes("Using plugin 'cv' (determined via front matter in 'test-fm-plugin.md')")) {
                throw new Error("Stdout does not confirm 'cv' plugin was used via front matter. Output:\n" + stdout);
            }
            console.log("  OK: Correct plugin ('cv' from front matter) reported in stdout.");
        },
        postTestCleanup: async () => {
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (fss.existsSync(fmPluginTestMdPath)) {
                await fs.unlink(fmPluginTestMdPath);
                console.log(`  Cleaned up test file: ${fmPluginTestMdPath}`);
            }
        }
    },
    // Test CLI override of front matter plugin
    {
        description: "Front Matter: CLI --plugin 'recipe' overrides 'cv' plugin in front matter",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'test-fm-plugin.md'), // Uses the same MD file created above
            '--plugin', 'recipe', // CLI specifies 'recipe'
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-fm-plugin-recipe-override.pdf',
            '--no-open'
        ],
        // preTestSetup is not strictly needed if previous test creates the file and it's not cleaned up
        // but to make it standalone, we can ensure it exists or re-create it.
        // For now, assume test-fm-plugin.md exists from previous test or we add setup.
        preTestSetup: async () => { // Ensure the file exists for this test too
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (!fss.existsSync(fmPluginTestMdPath)) {
                 const fmPluginTestMdContent = `---
title: "FM Plugin Test Doc for Override"
md_to_pdf_plugin: "cv" 
---
# Content`;
                await fs.writeFile(fmPluginTestMdPath, fmPluginTestMdContent);
            }
        },
        expectedOutputs: [
            { filePath: 'test-fm-plugin-recipe-override.pdf', minSize: 1000 },
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (!stdout.includes("Plugin 'recipe' specified via CLI, overriding front matter plugin 'cv'.")) {
                throw new Error("Stdout does not confirm CLI override message. Output:\n" + stdout);
            }
            if (!stdout.includes("Using plugin 'recipe' (determined via CLI option)")) {
                 throw new Error("Stdout does not confirm 'recipe' plugin was used via CLI. Output:\n" + stdout);
            }
            console.log("  OK: Correct plugin ('recipe' from CLI) and override message reported.");
        },
        postTestCleanup: async () => { // Cleanup the MD file after all related tests
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (fss.existsSync(fmPluginTestMdPath)) {
                await fs.unlink(fmPluginTestMdPath);
                console.log(`  Cleaned up test file: ${fmPluginTestMdPath}`);
            }
        }
    },
    // Test local config relative to the MD file
    {
        description: "Front Matter: Convert document specifying 'cv' plugin in front matter (using static asset)",
        commandArgs: [
            'convert',
            FM_CV_SPEC_MD_PATH, // Use static asset path
            '--outdir', path.join(TEST_OUTPUT_BASE_DIR, 'fm_plugin_output'),
            '--filename', 'test-fm-specifies-cv.pdf',
            '--no-open'
        ],
        // No preTestSetup or postTestCleanup needed for dynamic file creation
        expectedOutputs: [
            { filePath: path.join('fm_plugin_output', 'test-fm-specifies-cv.pdf'), minSize: 1000 },
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (!stdout.includes("Using plugin 'cv' (determined via front matter in 'fm_specifies_cv.md')")) {
                throw new Error("Stdout does not confirm 'cv' plugin was used via front matter. Output:\n" + stdout);
            }
            console.log("  OK: Correct plugin ('cv' from front matter) reported in stdout.");
        }
    },
    {
        description: "Front Matter: CLI --plugin 'recipe' overrides 'cv' in front matter (using static asset)",
        commandArgs: [
            'convert',
            FM_CV_SPEC_MD_PATH, // Use static asset path
            '--plugin', 'recipe', // CLI specifies 'recipe'
            '--outdir', path.join(TEST_OUTPUT_BASE_DIR, 'fm_override_output'),
            '--filename', 'test-fm-cli-overrides-cv.pdf',
            '--no-open'
        ],
        expectedOutputs: [
            { filePath: path.join('fm_override_output', 'test-fm-cli-overrides-cv.pdf'), minSize: 1000 },
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (!stdout.includes("Plugin 'recipe' specified via CLI, overriding front matter plugin 'cv'.")) {
                throw new Error("Stdout does not confirm CLI override message. Output:\n" + stdout);
            }
            if (!stdout.includes("Using plugin 'recipe' (determined via CLI option)")) {
                 throw new Error("Stdout does not confirm 'recipe' plugin was used via CLI. Output:\n" + stdout);
            }
            console.log("  OK: Correct plugin ('recipe' from CLI) and override message reported.");
        }
    },
    {
        description: "Local Config: Convert doc with plugin AND overrides from local <filename>.config.yaml (static assets)",
        commandArgs: [
            'convert',
            LOCAL_CONFIG_DOC_MD_PATH, 
            '--outdir', path.join(TEST_OUTPUT_BASE_DIR, 'local_config_static_output'),
            '--filename', 'test-local-config-static.pdf',
            '--no-open'
            // Implicitly uses test/config.test.yaml for base global settings
        ],
        preTestSetup: async() => {
            await fs.mkdir(path.join(TEST_OUTPUT_BASE_DIR, 'local_config_static_output'), { recursive: true });
        },
        expectedOutputs: [
            { filePath: path.join('local_config_static_output', 'test-local-config-static.pdf'), minSize: 500 }, // A6 is small
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            const expectedPluginSourceString = `local '${'doc_with_local_config.config.yaml'}'`;
            if (!stdout.includes(`Using plugin 'recipe' (determined via ${expectedPluginSourceString})`)) {
                throw new Error(`Stdout does not confirm 'recipe' plugin was used via ${expectedPluginSourceString}. Output:\n${stdout}`);
            }
            console.log(`  OK: Correct plugin ('recipe' from ${expectedPluginSourceString}) reported in stdout.`);
            console.log("  INFO: For full verification of overrides (A6 format, green bg, specific text), inspect the PDF with KEEP_OUTPUT=true.");
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
    const cliArgs = [...argsArray]; 
    const hasCustomConfig = cliArgs.some(arg => arg === '--config' || arg.startsWith('--config='));
    const isPluginCommand = cliArgs[0] === 'plugin';
    // For 'config' command, only add default TEST_CONFIG_PATH if it's NOT the one being explicitly tested
    // and no other --config is present.
    const isConfigCommandAndNotImplicitlyTestingDefault = cliArgs[0] === 'config' && !cliArgs.includes(TEST_CONFIG_PATH);
    
    let command = `node "${CLI_SCRIPT_PATH}" ${cliArgs.join(' ')}`;
    
    if (!hasCustomConfig && 
        !cliArgs.includes('--factory-defaults') && 
        !cliArgs.includes('--factory-default') && 
        !cliArgs.includes('-fd') &&
        !isPluginCommand && 
        !isConfigCommandAndNotImplicitlyTestingDefault) { // Logic for adding default test config
        if (!(cliArgs[0] === 'config' && cliArgs.length === 1)) { // Don't add for plain `md-to-pdf config`
             // Add default test config for convert/generate if no other config specified
             // AND for `md-to-pdf config --plugin <name>` if no other config specified
            if (cliArgs[0] !== 'config' || (cliArgs[0] === 'config' && cliArgs.includes('--plugin'))) {
                 command += ` --config "${TEST_CONFIG_PATH}"`;
            }
        }
    }


    console.log(`  Executing: ${command}`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_ROOT });
        if (stdout) console.log('  stdout:\n', stdout);
        const stderrContent = stderr && stderr.trim();
        if (stderrContent) {
            console.warn('  stderr:\n', stderr);
        }
        return { success: true, stdout, stderr };
    } catch (error) { 
        console.error(`  Error executing command (cli.js likely exited with error): ${error.message}`);
        if (error.stdout && error.stdout.trim()) console.error('  stdout (on error):\n', error.stdout);
        if (error.stderr && error.stderr.trim()) console.error('  stderr (on error):\n', error.stderr);
        return { success: false, error, stdout: error.stdout, stderr: error.stderr }; 
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
            if(testCasePassed) { 
                result = await runCliCommand(testCase.commandArgs);
                if (!result.success && !testCase.postTestChecks) { 
                    testCasePassed = false;
                    console.error(`  RESULT: Command execution failed for: ${testCase.description}`);
                } else if (testCase.expectedOutputs && testCase.expectedOutputs.length > 0) {
                    if (!result.success) { 
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
                if (testCasePassed || (!testCasePassed && result.error) ) { 
                    try {
                        console.log("  Running post-test checks...");
                        await testCase.postTestChecks(TEST_OUTPUT_BASE_DIR, result);
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
