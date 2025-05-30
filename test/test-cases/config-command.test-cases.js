// test/test-cases/config-command.test-cases.js
// Test cases for the 'md-to-pdf config' command

const path = require('path');
const yaml = require('js-yaml'); 

// Import necessary constants
const {
    TEST_CONFIG_PATH,
    PROJECT_ROOT,
    TEST_DIR, 
    // Any other constants used specifically by these tests
} = require('../test-constants');

const configCommandTestCases = [
    {
        description: "CLI: config - Display global config (explicitly using test/config.test.yaml)",
        commandArgs: ['config', '--config', TEST_CONFIG_PATH],
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
        description: "CLI: config --pure - Display pure global config (explicitly using test/config.test.yaml)",
        commandArgs: ['config', '--pure', '--config', TEST_CONFIG_PATH],
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
            const expectedOverrideSourceString = `Inline override from project main config: ${path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'cv_test.yaml'))}`;
            const normalizedProjectOverrideCssPath = path.normalize(path.join(TEST_DIR, 'assets', 'override_config', 'override_cv_style.css'));
            
            if (!stdout.includes("description: CV Test with Project-Specific Overrides (e.g., A5 format, green theme)")) throw new Error("Missing overridden description from cv_test.yaml's inline override.");
            if (!stdout.includes("format: A5")) throw new Error("Missing 'format: A5' from cv_test.yaml's inline override.");
            if (!stdout.includes(expectedOverrideSourceString)) throw new Error(`Missing expected source string for inline override: '${expectedOverrideSourceString}'. Check 'Contributing Configuration Files' in output. Full stdout:\n${stdout}`);
            if (!stdout.includes(normalizedProjectOverrideCssPath)) throw new Error(`Missing overridden CSS path '${normalizedProjectOverrideCssPath}'.`);
        }
    }
];

module.exports = { testCases: configCommandTestCases };
