// test/test-cases/plugin-create-command.test-cases.js
// Test cases for the 'md-to-pdf plugin create' command

const path = require('path');
const fs = require('fs'); // For fss.existsSync in postTestChecks
const fsp = require('fs').promises; // For fs.writeFile in preTestSetup

// Import necessary constants
const {
    CREATED_PLUGINS_DIR,
    // Any other constants used specifically by these plugin create tests
} = require('../test-constants');

// Import necessary helpers
const {
    readFileContent,
    checkFile,
} = require('../test-helpers');


const pluginCreateCommandTestCases = [
    {
        description: "CLI: plugin create - Basic plugin scaffolding",
        commandArgs: ['plugin', 'create', 'scaffold-test1', '--dir', CREATED_PLUGINS_DIR],
        expectedOutputs: [], 
        postTestChecks: async (testCaseOutputDir, result) => { 
            if (!result.success) throw new Error(`CLI command failed unexpectedly: ${result.error?.message || 'Unknown error'}`);
            const pluginDir = path.join(CREATED_PLUGINS_DIR, 'scaffold-test1');
            if (!fs.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);

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
            if (!fs.existsSync(pluginDir)) { 
                await fsp.mkdir(pluginDir, { recursive: true });
            }
            await fsp.writeFile(path.join(pluginDir, 'dummy.txt'), 'this should ideally be gone or ignored');
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
             if (fs.existsSync(path.join(pluginDir, 'dummy.txt'))) {
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
            if (!fs.existsSync(pluginDir)) throw new Error(`Plugin directory not created: ${pluginDir}`);
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

module.exports = { testCases: pluginCreateCommandTestCases };
