// test/test-cases/advanced-features.test-cases.js
// Test cases for features like Front Matter plugin spec, local .config.yaml, etc.

const path = require('path');
const fs = require('fs'); // For fss.existsSync in preTestSetup/postTestCleanup
const fsp = require('fs').promises; // For fsp.writeFile/unlink/mkdir in preTestSetup/postTestCleanup

// Import necessary constants
const {
    TEST_DIR,
    TEST_OUTPUT_BASE_DIR,
    FM_CV_SPEC_MD_PATH,
    LOCAL_CONFIG_DOC_MD_PATH,
    // Any other constants used specifically by these tests
} = require('../test-constants');

// Helpers like readFileContent or checkFile are not directly used in these postTestChecks
// but path and fs/fsp are used for setup/cleanup.

const advancedFeaturesTestCases = [
    {
        description: "Front Matter: Convert document specifying 'cv' plugin in front matter",
        commandArgs: [
            'convert', 
            path.join(TEST_DIR, 'assets', 'test-fm-plugin.md'), // This path might need to be more robust if assets dir changes
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-fm-plugin-cv-output.pdf',
            '--no-open' 
        ],
        preTestSetup: async () => {
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            const fmPluginTestMdContent = `---
title: "FM Plugin Test Doc"
md_to_pdf_plugin: "cv"
---

# Document Title Should Be Handled by CV Plugin

This document explicitly requests the 'cv' plugin via front matter.`;
            await fsp.writeFile(fmPluginTestMdPath, fmPluginTestMdContent);
            console.log(`  Created test file: ${fmPluginTestMdPath}`);
        },
        expectedOutputs: [
            { filePath: 'test-fm-plugin-cv-output.pdf', minSize: 1000 }, 
        ],
        postTestChecks: async (testCaseOutputDir, result) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.error?.message || 'Unknown error'}`);
            const stdout = result.stdout || "";
            if (!stdout.includes("Using plugin 'cv' (determined via front matter in 'test-fm-plugin.md')")) {
                throw new Error("Stdout does not confirm 'cv' plugin was used via front matter. Output:\n" + stdout);
            }
            console.log("  OK: Correct plugin ('cv' from front matter) reported in stdout.");
        },
        postTestCleanup: async () => {
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (fs.existsSync(fmPluginTestMdPath)) {
                await fsp.unlink(fmPluginTestMdPath);
                console.log(`  Cleaned up test file: ${fmPluginTestMdPath}`);
            }
        }
    },
    {
        description: "Front Matter: CLI --plugin 'recipe' overrides 'cv' plugin in front matter",
        commandArgs: [
            'convert',
            path.join(TEST_DIR, 'assets', 'test-fm-plugin.md'), 
            '--plugin', 'recipe', 
            '--outdir', TEST_OUTPUT_BASE_DIR,
            '--filename', 'test-fm-plugin-recipe-override.pdf',
            '--no-open'
        ],
        preTestSetup: async () => { 
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (!fs.existsSync(fmPluginTestMdPath)) {
                 const fmPluginTestMdContent = `---
title: "FM Plugin Test Doc for Override"
md_to_pdf_plugin: "cv" 
---
# Content`;
                await fsp.writeFile(fmPluginTestMdPath, fmPluginTestMdContent);
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
        postTestCleanup: async () => { 
            const fmPluginTestMdPath = path.join(TEST_DIR, 'assets', 'test-fm-plugin.md');
            if (fs.existsSync(fmPluginTestMdPath)) {
                await fsp.unlink(fmPluginTestMdPath);
                console.log(`  Cleaned up test file: ${fmPluginTestMdPath}`);
            }
        }
    },
    {
        description: "Front Matter: Convert document specifying 'cv' plugin in front matter (using static asset)",
        commandArgs: [
            'convert',
            FM_CV_SPEC_MD_PATH, 
            '--outdir', path.join(TEST_OUTPUT_BASE_DIR, 'fm_plugin_output'),
            '--filename', 'test-fm-specifies-cv.pdf',
            '--no-open'
        ],
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
            FM_CV_SPEC_MD_PATH, 
            '--plugin', 'recipe', 
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
        ],
        preTestSetup: async() => {
            await fsp.mkdir(path.join(TEST_OUTPUT_BASE_DIR, 'local_config_static_output'), { recursive: true });
        },
        expectedOutputs: [
            { filePath: path.join('local_config_static_output', 'test-local-config-static.pdf'), minSize: 500 }, 
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

module.exports = { testCases: advancedFeaturesTestCases };
