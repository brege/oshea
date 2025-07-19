// test/shared/test-helpers.js
const fsPromises = require('fs').promises;
const fss = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { loggerPath, nodeModulesPath } = require('@paths');
const logger = require(loggerPath);
const execAsync = util.promisify(exec);

logger.debug(`[test-helpers] Loaded from: ${__filename}`);

async function readFileContent(filePath) {
  logger.debug(`[readFileContent] Called with: ${filePath}`);
  if (!fss.existsSync(filePath)) {
    throw new Error(`File not found for content check: ${filePath}`);
  }
  return fsPromises.readFile(filePath, 'utf8');
}

async function checkFile(baseDir, relativeFilePath, minSize) {
  logger.debug(`[checkFile] baseDir: ${baseDir}, relativeFilePath: ${relativeFilePath}, minSize: ${minSize}`);
  const fullPath = path.join(baseDir, relativeFilePath);
  try {
    await fsPromises.access(fullPath, fss.constants.F_OK);
  } catch (e) {
    throw new Error(`File not found or not accessible: ${fullPath} - ${e.message}`);
  }
  const stats = await fsPromises.stat(fullPath);
  if (stats.size < minSize) {
    throw new Error(`File ${fullPath} is too small (${stats.size} bytes, expected >= ${minSize} bytes).`);
  }
  logger.debug(`  OK: File ${relativeFilePath} (at ${fullPath}) exists and size (${stats.size} bytes) is sufficient.`);
  return true;
}

async function runCliCommand(argsArray, cliScriptPath, projectRoot, testConfigPath) {
  logger.debug(`[runCliCommand] argsArray: ${JSON.stringify(argsArray)}, cliScriptPath: ${cliScriptPath}, projectRoot: ${projectRoot}, testConfigPath: ${testConfigPath}`);
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

  logger.debug(`  Executing: ${command}`);
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath
      }
    });
    if (stdout) logger.debug('  stdout:\n', stdout);
    const stderrContent = stderr && stderr.trim();
    if (stderrContent) {
      logger.warn('  stderr:\n', stderr);
    }
    return { success: true, stdout, stderr };
  } catch (error) {
    logger.error(`  Error executing command (cli.js likely exited with error): ${error.message}`);
    if (error.stdout && error.stdout.trim()) logger.error('  stdout (on error):\n', error.stdout);
    if (error.stderr && error.stderr.trim()) logger.error('  stderr (on error):\n', error.stderr);
    return { success: false, error, stdout: error.stdout, stderr: error.stderr };
  }
}

async function setupTestDirectory(testOutputBaseDir, createdPluginsDir) {
  logger.debug(`[setupTestDirectory] Called with: ${testOutputBaseDir}, ${createdPluginsDir}`);
  logger.debug(`[setupTestDirectory] __filename: ${__filename}`);
  if (!testOutputBaseDir) {
    logger.error('[setupTestDirectory] testOutputBaseDir is undefined!');
    throw new Error('setupTestDirectory: testOutputBaseDir is required');
  }
  try {
    if (fss.existsSync(testOutputBaseDir)) {
      logger.debug(`Removing existing test output directory: ${testOutputBaseDir}`);
      await fsPromises.rm(testOutputBaseDir, { recursive: true, force: true });
    }
    logger.debug(`Creating test output directory: ${testOutputBaseDir}`);
    await fsPromises.mkdir(testOutputBaseDir, { recursive: true });
    if (createdPluginsDir && !fss.existsSync(createdPluginsDir)) {
      logger.debug(`Creating plugins directory: ${createdPluginsDir}`);
      await fsPromises.mkdir(createdPluginsDir, { recursive: true });
    }
  } catch (error) {
    logger.error(`[setupTestDirectory] Error setting up test directory: ${error && error.message}`);
    throw error;
  }
}

async function cleanupTestDirectory(testOutputBaseDir, keepOutput = false) {
  logger.debug(`[cleanupTestDirectory] Called with: ${testOutputBaseDir}, keepOutput: ${keepOutput}`);
  if (keepOutput) {
    logger.info(`KEEP_OUTPUT is true. Skipping cleanup of ${testOutputBaseDir}.`);
    return;
  }
  try {
    if (fss.existsSync(testOutputBaseDir)) {
      logger.debug(`Cleaning up test output directory: ${testOutputBaseDir}`);
      await fsPromises.rm(testOutputBaseDir, { recursive: true, force: true });
    }
  } catch (error) {
    logger.warn(`[cleanupTestDirectory] Warning: Could not clean up test directory ${testOutputBaseDir}: ${error && error.message}`);
  }
}

async function checkFileExists(filePath) {
  logger.debug(`[checkFileExists] Called with: ${filePath}`);
  if (!fss.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  logger.debug(`  OK: File exists: ${path.basename(filePath)}`);
  return true;
}

async function cleanupDir(dirPath) {
  logger.debug(`[cleanupDir] Called with: ${dirPath}`);
  if (fss.existsSync(dirPath)) {
    try {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
    } catch (e) {
      logger.warn(`  WARN: Could not fully cleanup directory ${dirPath}: ${e.message}`);
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
