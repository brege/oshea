// test/test-helpers.js
const fs = require('fs').promises;
const fss = require('fs'); // Sync operations
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function readFileContent(filePath) {
    if (!fss.existsSync(filePath)) {
        throw new Error(`File not found for content check: ${filePath}`);
    }
    return fs.readFile(filePath, 'utf8');
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

async function runCliCommand(argsArray, cliScriptPath, projectRoot, testConfigPath) {
    const cliArgs = [...argsArray];
    const hasCustomConfig = cliArgs.some(arg => arg === '--config' || arg.startsWith('--config='));
    const isPluginCommand = cliArgs[0] === 'plugin';
    const isConfigCommandAndNotImplicitlyTestingDefault = cliArgs[0] === 'config' && !cliArgs.includes(testConfigPath);

    let command = `node "${cliScriptPath}" ${cliArgs.join(' ')}`;

    if (!hasCustomConfig &&
        !cliArgs.includes('--factory-defaults') &&
        !cliArgs.includes('--factory-default') &&
        !cliArgs.includes('-fd') &&
        !isPluginCommand &&
        !isConfigCommandAndNotImplicitlyTestingDefault) {
        if (!(cliArgs[0] === 'config' && cliArgs.length === 1)) {
            if (cliArgs[0] !== 'config' || (cliArgs[0] === 'config' && cliArgs.includes('--plugin'))) {
                command += ` --config "${testConfigPath}"`;
            }
        }
    }

    console.log(`  Executing: ${command}`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });
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

async function setupTestDirectory(testOutputBaseDir, createdPluginsDir) {
    try {
        if (fss.existsSync(testOutputBaseDir)) {
            console.log(`Removing existing test output directory: ${testOutputBaseDir}`);
            await fs.rm(testOutputBaseDir, { recursive: true, force: true });
        }
        console.log(`Creating test output directory: ${testOutputBaseDir}`);
        await fs.mkdir(testOutputBaseDir, { recursive: true });
        if (!fss.existsSync(createdPluginsDir)) {
            await fs.mkdir(createdPluginsDir, { recursive: true });
        }
    } catch (error) {
        console.error(`Error setting up test directory: ${error.message}`);
        throw error;
    }
}

async function cleanupTestDirectory(testOutputBaseDir, keepOutput = false) {
    if (keepOutput) {
        console.log(`KEEP_OUTPUT is true. Skipping cleanup of ${testOutputBaseDir}.`);
        return;
    }
    try {
        if (fss.existsSync(testOutputBaseDir)) {
            console.log(`Cleaning up test output directory: ${testOutputBaseDir}`);
            await fs.rm(testOutputBaseDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Warning: Could not clean up test directory ${testOutputBaseDir}: ${error.message}`);
    }
}

module.exports = {
    execAsync,
    readFileContent,
    checkFile,
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
};
