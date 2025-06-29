// test/shared/test-helpers.js
const fs_promises = require('fs').promises;
const fss = require('fs'); // Sync operations (and now for fs.constants.F_OK)
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function readFileContent(filePath) {
    if (!fss.existsSync(filePath)) {
        throw new Error(`File not found for content check: ${filePath}`);
    }
    return fs_promises.readFile(filePath, 'utf8');
}

async function checkFile(baseDir, relativeFilePath, minSize) {
    const fullPath = path.join(baseDir, relativeFilePath);
    try {
        await fs_promises.access(fullPath, fss.constants.F_OK); // Use fss.constants.F_OK
    } catch (e) {
        throw new Error(`File not found or not accessible: ${fullPath} - ${e.message}`);
    }
    const stats = await fs_promises.stat(fullPath);
    if (stats.size < minSize) {
        throw new Error(`File ${fullPath} is too small (${stats.size} bytes, expected >= ${minSize} bytes).`);
    }
    console.log(`  OK: File ${relativeFilePath} (at ${fullPath}) exists and size (${stats.size} bytes) is sufficient.`);
    return true;
}

async function runCliCommand(argsArray, cliScriptPath, projectRoot, testConfigPath) {
    const cliArgs = [...argsArray];
    const hasCustomConfig = cliArgs.some(arg => arg === '--config' || arg.startsWith('--config='));
    
    let applyTestConfig = !hasCustomConfig &&
                         !cliArgs.includes('--factory-defaults') &&
                         !cliArgs.includes('--factory-default') &&
                         !cliArgs.includes('-fd');

    if (cliArgs[0] === 'config' && applyTestConfig) {
        if (!cliArgs.includes('--plugin') && cliArgs.length === 1) { 
            applyTestConfig = false;
        }
    }
    
    let command = `node "${cliScriptPath}" ${cliArgs.join(' ')}`;
    if (applyTestConfig && typeof testConfigPath === 'string' && testConfigPath.length > 0) {
        command += ` --config "${testConfigPath}"`;
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
            await fs_promises.rm(testOutputBaseDir, { recursive: true, force: true });
        }
        console.log(`Creating test output directory: ${testOutputBaseDir}`);
        await fs_promises.mkdir(testOutputBaseDir, { recursive: true });
        if (createdPluginsDir && !fss.existsSync(createdPluginsDir)) {
            await fs_promises.mkdir(createdPluginsDir, { recursive: true });
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
            await fs_promises.rm(testOutputBaseDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Warning: Could not clean up test directory ${testOutputBaseDir}: ${error.message}`);
    }
}

async function checkFileExists(filePath) {
    // This function is less robust than checkFile, but keeping for direct `existsSync` usage if needed elsewhere.
    if (!fss.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    console.log(`  OK: File exists: ${path.basename(filePath)}`);
    return true;
}

async function cleanupDir(dirPath) {
    if (fss.existsSync(dirPath)) {
        try {
            await fs_promises.rm(dirPath, { recursive: true, force: true });
        } catch (e) {
            console.warn(`  WARN: Could not fully cleanup directory ${dirPath}: ${e.message}`);
        }
    }
}

module.exports = {
    execAsync,
    readFileContent,
    checkFile,
    runCliCommand,
    setupTestDirectory,
    cleanupTestDirectory,
    checkFileExists,
    cleanupDir,
};
