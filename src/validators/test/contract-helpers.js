const fsPromises = require('node:fs').promises;
const fss = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');
const util = require('node:util');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);
const execAsync = util.promisify(exec);

function resolveRuntimeNodeModulesPath() {
  const moduleAliasRegisterPath = require.resolve('module-alias/register');
  return path.dirname(path.dirname(moduleAliasRegisterPath));
}

async function readFileContent(filePath) {
  logger.debug('Reading file content', {
    context: 'contract-test-helpers.readFileContent',
    file: filePath,
  });
  if (!fss.existsSync(filePath)) {
    throw new Error(`File not found for content check: ${filePath}`);
  }
  return fsPromises.readFile(filePath, 'utf8');
}

async function checkFile(baseDir, relativeFilePath, minSize) {
  logger.debug('Checking file', {
    context: 'contract-test-helpers.checkFile',
    baseDir,
    relativeFilePath,
    minSize,
  });
  const fullPath = path.join(baseDir, relativeFilePath);
  try {
    await fsPromises.access(fullPath, fss.constants.F_OK);
  } catch (e) {
    throw new Error(
      `File not found or not accessible: ${fullPath} - ${e.message}`,
      { cause: e },
    );
  }
  const stats = await fsPromises.stat(fullPath);
  if (stats.size < minSize) {
    throw new Error(
      `File ${fullPath} is too small (${stats.size} bytes, expected >= ${minSize} bytes).`,
    );
  }
  return true;
}

async function runCliCommand(
  argsArray,
  cliScriptPath,
  projectRoot,
  testConfigPath,
) {
  const cliArgs = [...argsArray];
  const hasCustomConfig = cliArgs.some(
    (arg) => arg === '--config' || arg.startsWith('--config='),
  );

  let applyTestConfig =
    !hasCustomConfig &&
    !cliArgs.includes('--factory-defaults') &&
    !cliArgs.includes('--factory-default') &&
    !cliArgs.includes('-fd');

  if (cliArgs[0] === 'config' && applyTestConfig) {
    if (!cliArgs.includes('--plugin') && cliArgs.length === 1) {
      applyTestConfig = false;
    }
  }

  let command = `node "${cliScriptPath}" ${cliArgs.join(' ')}`;
  if (
    applyTestConfig &&
    typeof testConfigPath === 'string' &&
    testConfigPath.length > 0
  ) {
    command += ` --config "${testConfigPath}"`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_PATH: resolveRuntimeNodeModulesPath(),
      },
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      error,
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }
}

async function setupTestDirectory(testOutputBaseDir, createdPluginsDir) {
  if (!testOutputBaseDir) {
    throw new Error('setupTestDirectory: testOutputBaseDir is required');
  }
  if (fss.existsSync(testOutputBaseDir)) {
    await fsPromises.rm(testOutputBaseDir, { recursive: true, force: true });
  }
  await fsPromises.mkdir(testOutputBaseDir, { recursive: true });
  if (createdPluginsDir && !fss.existsSync(createdPluginsDir)) {
    await fsPromises.mkdir(createdPluginsDir, { recursive: true });
  }
}

async function cleanupTestDirectory(testOutputBaseDir, keepOutput = false) {
  if (keepOutput) {
    logger.info(
      `KEEP_OUTPUT is true. Skipping cleanup of ${testOutputBaseDir}.`,
    );
    return;
  }
  if (fss.existsSync(testOutputBaseDir)) {
    await fsPromises.rm(testOutputBaseDir, { recursive: true, force: true });
  }
}

async function checkFileExists(filePath) {
  if (!fss.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return true;
}

async function cleanupDir(dirPath) {
  if (fss.existsSync(dirPath)) {
    try {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
    } catch (e) {
      logger.warn(`Could not fully cleanup directory ${dirPath}: ${e.message}`);
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
