// test/test-cases/plugin-create-command.test-cases.js
const path = require('path');
const fs = require('fs'); // For synchronous operations like existsSync
const fsp = require('fs').promises; // For async file operations
const yaml = require('js-yaml'); // For checking config content
// const os = require('os'); // Not strictly needed for this file

const {
    CREATED_PLUGINS_DIR, 
    PROJECT_ROOT,        
    // TEST_OUTPUT_BASE_DIR // Not directly used here, paths built from CREATED_PLUGINS_DIR
} = require('../test-constants');

const {
    readFileContent,
    checkFileExists, 
    cleanupDir,      
} = require('../test-helpers'); 

const BUNDLED_TEMPLATE_PATH_ABS = path.resolve(PROJECT_ROOT, 'plugins', 'template-basic');
const BUNDLED_CV_PLUGIN_PATH_REL = './plugins/cv'; // Relative path as used in --from
const BUNDLED_CV_PLUGIN_PATH_ABS = path.resolve(PROJECT_ROOT, 'plugins', 'cv');
const BUNDLED_DEFAULT_PLUGIN_PATH_REL = './plugins/default';


// Helper function to check common archetyped file contents
async function checkArchetypeContents(pluginDir, newPluginName, expectedSourceIdentifierInDesc, exampleMdShouldExist = true, originalPluginIdForContent = null) {
    const configPath = path.join(pluginDir, `${newPluginName}.config.yaml`);
    const indexPath = path.join(pluginDir, 'index.js');
    const cssPath = path.join(pluginDir, `${newPluginName}.css`);
    const readmePath = path.join(pluginDir, 'README.md');
    const exampleMdPath = path.join(pluginDir, `${newPluginName}-example.md`);

    await checkFileExists(configPath);
    await checkFileExists(indexPath);
    await checkFileExists(cssPath);
    await checkFileExists(readmePath);
    if (exampleMdShouldExist) {
        await checkFileExists(exampleMdPath);
    }

    const configContent = await readFileContent(configPath);
    const indexContent = await readFileContent(indexPath);
    const readmeContent = await readFileContent(readmePath);
    
    const loadedConfig = yaml.load(configContent);
    const actualDescription = loadedConfig.description || "";

    // The description in config should be: Archetype of "<sourcePluginIdentifier_AS_PASSED_TO_ARCHETYPE>": <original_description_from_source_config>
    // originalPluginDescriptionFromSource is 'Original description for ${sourcePluginIdForReplacement}' or 'A new template-basic plugin...'
    // For template: `Archetype of "${BUNDLED_TEMPLATE_PATH_ABS}": A new template-basic plugin for [describe your plugin's purpose here].`
    // For --from ./plugins/cv: `Archetype of "./plugins/cv": Plugin for Curriculum Vitae (CV) documents.`

    if (!actualDescription.startsWith(`Archetype of "${expectedSourceIdentifierInDesc}":`)) {
        throw new Error(`Config description for ${newPluginName} does not correctly reference source "${expectedSourceIdentifierInDesc}".\nFound: '${actualDescription}'`);
    }

    if (!loadedConfig.css_files || !loadedConfig.css_files.includes(`${newPluginName}.css`)) {
        throw new Error(`Config for ${newPluginName} does not reference correct CSS file. Found: ${loadedConfig.css_files}`);
    }

    const idForContentReplacement = originalPluginIdForContent || path.basename(expectedSourceIdentifierInDesc);
    const pascalCaseForContent = toPascalCase(idForContentReplacement);
    const newPascalCase = toPascalCase(newPluginName);

    if (loadedConfig.handler_script !== 'index.js' && loadedConfig.handler_script !== `${newPluginName}.js`) {
        if (!(idForContentReplacement.toLowerCase() === 'index' && loadedConfig.handler_script === 'index.js')) { // if original was index.js it stays index.js
             throw new Error(`Config for ${newPluginName} does not reference correct handler script. Found: ${loadedConfig.handler_script}`);
        }
    }
    if (loadedConfig.handler_script === `${newPluginName}.js`) { // Check class name only if script was renamed
      if (!indexContent.includes(`class ${newPascalCase}Handler`)) {
          throw new Error(`index.js for ${newPluginName} does not contain correctly cased Handler class ${newPascalCase}Handler.`);
      }
    }


    if (!readmeContent.includes(`Plugin: ${newPluginName}`)) {
        throw new Error(`README.md for ${newPluginName} does not reference the new plugin name in cli_help.`);
    }
    if (!readmeContent.includes(`archetype of the "${expectedSourceIdentifierInDesc}" plugin, created as "${newPluginName}"`)) {
        throw new Error(`README.md for ${newPluginName} does not contain correct archetype note. Expected source: "${expectedSourceIdentifierInDesc}"`);
    }

    if (exampleMdShouldExist) {
        const exampleMdContent = await readFileContent(exampleMdPath);
        if (!exampleMdContent.includes(`md_to_pdf_plugin: "./${newPluginName}.config.yaml"`)) {
            throw new Error(`Example MD for ${newPluginName} does not self-reference its config correctly.`);
        }
    }
}
// Helper for PascalCase conversion (can also be imported if moved to a shared util)
function toPascalCase(str) {
  if (!str) return '';
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}


const pluginCreateCommandTestCases = [
    {
        description: "CLI: plugin create new-template-plug (default template, default CWD target)",
        commandArgs: ['plugin', 'create', 'new-template-plug', '--force'],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(process.cwd(), 'new-template-plug');
            await cleanupDir(testCase.targetPluginDir); 
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.stderr || result.error?.message}`);
            if (!fs.existsSync(testCase.targetPluginDir)) throw new Error(`Plugin directory not created at ${testCase.targetPluginDir}`);
            await checkArchetypeContents(testCase.targetPluginDir, 'new-template-plug', BUNDLED_TEMPLATE_PATH_ABS, true, 'template-basic');
            if (!result.stdout.includes("Target base directory (for template): " + process.cwd())) {
                 throw new Error("Stdout did not correctly indicate CWD as target base for template creation without --target-dir.");
            }
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create new-template-custom-dir --target-dir <CREATED_PLUGINS_DIR> (default template, custom dir)",
        commandArgs: ['plugin', 'create', 'new-template-custom-dir', '--target-dir', CREATED_PLUGINS_DIR, '--force'],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(CREATED_PLUGINS_DIR, 'new-template-custom-dir');
            await cleanupDir(testCase.targetPluginDir);
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.stderr || result.error?.message}`);
            if (!fs.existsSync(testCase.targetPluginDir)) throw new Error(`Plugin directory not created at ${testCase.targetPluginDir}`);
            await checkArchetypeContents(testCase.targetPluginDir, 'new-template-custom-dir', BUNDLED_TEMPLATE_PATH_ABS, true, 'template-basic');
            if (!result.stdout.includes("Target base directory (for template): " + path.resolve(CREATED_PLUGINS_DIR))) {
                 throw new Error("Stdout did not correctly indicate custom dir as target base for template creation.");
            }
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create arch-from-cv --from ./plugins/cv --target-dir <CREATED_PLUGINS_DIR> (archetype from direct path)",
        commandArgs: ['plugin', 'create', 'arch-from-cv', '--from', BUNDLED_CV_PLUGIN_PATH_REL, '--target-dir', CREATED_PLUGINS_DIR, '--force'],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(CREATED_PLUGINS_DIR, 'arch-from-cv');
            await cleanupDir(testCase.targetPluginDir);
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (!result.success) throw new Error(`CLI command failed: ${result.stderr || result.error?.message}`);
            if (!fs.existsSync(testCase.targetPluginDir)) throw new Error(`Plugin directory not created at ${testCase.targetPluginDir}`);
            await checkArchetypeContents(testCase.targetPluginDir, 'arch-from-cv', BUNDLED_CV_PLUGIN_PATH_REL, false, 'cv'); // cv plugin has no example.md
            if (!result.stdout.includes(`Attempting to create plugin 'arch-from-cv' by archetyping from source '${BUNDLED_CV_PLUGIN_PATH_REL}'`)){
                 throw new Error("Stdout did not correctly indicate source for --from.");
            }
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create existing-dir-no-force --target-dir <CREATED_PLUGINS_DIR> (error on existing, no --force)",
        commandArgs: ['plugin', 'create', 'existing-dir-no-force', '--target-dir', CREATED_PLUGINS_DIR],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(CREATED_PLUGINS_DIR, 'existing-dir-no-force');
            await cleanupDir(testCase.targetPluginDir); 
            await fsp.mkdir(testCase.targetPluginDir, { recursive: true }); 
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (result.success) throw new Error("Command should have failed (target dir exists, no --force).");
            const expectedErrorPart = `Target archetype directory "${testCase.targetPluginDir}" already exists. Use --force to overwrite or choose a different name.`;
            if (!result.stderr || !result.stderr.includes(expectedErrorPart)) { // Check for plain string
                throw new Error(`Expected error about existing directory not found in stderr. Expected part: '${expectedErrorPart}'. Stderr: ${result.stderr}`);
            }
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create existing-dir-with-force --target-dir <CREATED_PLUGINS_DIR> --force (overwrite existing)",
        commandArgs: ['plugin', 'create', 'existing-dir-with-force', '--target-dir', CREATED_PLUGINS_DIR, '--force'],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(CREATED_PLUGINS_DIR, 'existing-dir-with-force');
            await cleanupDir(testCase.targetPluginDir);
            await fsp.mkdir(testCase.targetPluginDir, { recursive: true });
            await fsp.writeFile(path.join(testCase.targetPluginDir, 'dummy.txt'), "should be overwritten/gone");
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (!result.success) throw new Error(`CLI command failed with --force: ${result.stderr || result.error?.message}`);
            if (!fs.existsSync(testCase.targetPluginDir)) throw new Error(`Plugin directory not created at ${testCase.targetPluginDir}`);
            await checkArchetypeContents(testCase.targetPluginDir, 'existing-dir-with-force', BUNDLED_TEMPLATE_PATH_ABS, true, 'template-basic');
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create bad!name (invalid name check)",
        commandArgs: ['plugin', 'create', 'bad!name', '--target-dir', CREATED_PLUGINS_DIR],
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (result.success) throw new Error("Command should have failed (invalid name).");
            if (!result.stderr || !result.stderr.includes('ERROR: Invalid plugin name: "bad!name"')) {
                throw new Error(`Expected error about invalid name not found in stderr. Stderr: ${result.stderr}`);
            }
        }
    },
    {
        description: "CLI: plugin create --from non-existent-source (error check)",
        commandArgs: ['plugin', 'create', 'someplug', '--from', './non-existent-dir-source', '--target-dir', CREATED_PLUGINS_DIR],
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (result.success) throw new Error("Command should have failed (source for --from does not exist).");
            const expectedErrorPart = `Source plugin path "${path.resolve('./non-existent-dir-source')}" (from identifier "./non-existent-dir-source") not found or is not a directory.`;
            if (!result.stderr || !result.stderr.includes(expectedErrorPart)) {
                throw new Error(`Expected error about non-existent source for --from not found in stderr. Expected: '${expectedErrorPart}'. Stderr: ${result.stderr}`);
            }
        }
    },
    {
        description: "CLI: deprecated collection archetype command",
        commandArgs: ['collection', 'archetype', BUNDLED_DEFAULT_PLUGIN_PATH_REL, 'my-deprecated-arch', '--target-dir', CREATED_PLUGINS_DIR, '--force'],
        preTestSetup: async (testCase) => {
            testCase.targetPluginDir = path.join(CREATED_PLUGINS_DIR, 'my-deprecated-arch');
            await cleanupDir(testCase.targetPluginDir);
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            // This command is expected to succeed functionally but print a warning to stderr
            if (!result.stderr || !result.stderr.includes('Warning: The "collection archetype" command is deprecated')) {
                throw new Error(`Deprecation warning for "collection archetype" not found in stderr. Stderr: ${result.stderr}`);
            }
            if (!result.success && result.stderr && result.stderr.includes("Unknown argument")) { // if it failed due to yargs issue
                 throw new Error(`Deprecated command failed with yargs error: ${result.stderr}`);
            }
            if (!fs.existsSync(testCase.targetPluginDir)) throw new Error(`Deprecated command did not create plugin directory at ${testCase.targetPluginDir}`);
            // 'default' plugin has no example.md, and its 'originalPluginIdForContent' is 'default'
            await checkArchetypeContents(testCase.targetPluginDir, 'my-deprecated-arch', BUNDLED_DEFAULT_PLUGIN_PATH_REL, false, 'default');
        },
        postTestCleanup: async (testCase) => {
            await cleanupDir(testCase.targetPluginDir);
        }
    },
    {
        description: "CLI: plugin create arch-from-cm-coll/plug (CM source - placeholder for manual or future test)",
        commandArgs: ['plugin', 'create', 'arch-from-cm', '--from', 'my-test-collection/my-test-plugin', '--target-dir', CREATED_PLUGINS_DIR, '--force'],
        preTestSetup: async (testCase) => {
            console.warn("WARN: Test 'CLI: plugin create arch-from-cm-coll/plug' is a placeholder. True testing of CM source via CLI requires mock COLL_ROOT or manual setup.");
            testCase.shouldSkip = true; 
        },
        postTestChecks: async (testCaseOutputDir, result, testCase) => {
            if (testCase.shouldSkip) {
                console.log("Skipping postTestChecks for placeholder CM source test.");
                return;
            };
            // This part will not be reached if shouldSkip is true.
            // If we were to run it, it would fail because 'my-test-collection/my-test-plugin' isn't set up.
            if (result.success) throw new Error("Command should have failed (mock CM source not found).");
            if (!result.stderr || !result.stderr.includes('not found via CollectionsManager')) {
                // throw new Error(`Expected error about CM source not found. Stderr: ${result.stderr}`);
            }
        },
    }
];

module.exports = { testCases: pluginCreateCommandTestCases };
