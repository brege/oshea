// test/analytics/test-watcher.js
require('module-alias/register');

const {
  projectRoot,
  srcRoot,
  integrationTestDir,
  loggerPath,
} = require('@paths');
const chokidar = require('chokidar');
const path = require('path');
const { spawn } = require('child_process');
const glob = require('glob');
const logger = require(loggerPath);

function buildTestMap() {
  const targetToPathMap = new Map();
  const allTestFiles = glob.sync(path.join(integrationTestDir, '**/*.test.js'));
  allTestFiles.forEach((testPath) => {
    const testNameMatch = path
      .basename(testPath)
      .match(/^([a-zA-Z0-9_-]+)\.test\.js$/);
    if (testNameMatch) {
      const targetName = testNameMatch[1];
      if (!targetToPathMap.has(targetName)) {
        targetToPathMap.set(targetName, new Set());
      }
      targetToPathMap
        .get(targetName)
        .add({ path: testPath, reason: 'Direct name match' });
    }
  });

  return new Map(
    Array.from(targetToPathMap.entries()).map(([target, pathSet]) => [
      target,
      Array.from(pathSet),
    ]),
  );
}

function runTests(testPathsInfo) {
  if (!testPathsInfo || testPathsInfo.length === 0) {
    logger.warn('No tests found for the changed file.\n', {
      context: 'Watcher',
      format: 'inline',
    });
    return;
  }
  const testPaths = testPathsInfo.map((info) => info.path);
  logger.info(`\nRunning tests:\n  - ${testPaths.join('\n  - ')}\n`, {
    context: 'Watcher',
    format: 'inline',
  });
  const mocha = spawn('npx', ['mocha', ...testPaths], {
    stdio: 'inherit',
    cwd: projectRoot,
  });
  mocha.on('close', (code) => {
    logger.info(
      `Mocha process exited with code ${code}. Watching for next change...\n`,
      { context: 'Watcher', format: 'inline' },
    );
  });
}

function printInstrumentation(map) {
  logger.info('\nWatcher Instrumentation (Source -> Tests Map):\n', {
    format: 'inline',
  });
  if (map.size === 0) {
    logger.warn(
      '  No mappings found. Check test file names and checklists.\n',
      { format: 'inline' },
    );
    return;
  }
  const sortedTargets = Array.from(map.keys()).sort();
  for (const target of sortedTargets) {
    const testPathsInfo = map.get(target);
    logger.success(`\n  ◉ ${target}\n`, { format: 'inline' });
    testPathsInfo.forEach((info) =>
      logger.detail(`    └─ ${info.path} (Found via: ${info.reason})\n`, {
        format: 'inline',
      }),
    );
  }
  logger.info('\nEnd of Instrumentation\n\n', { format: 'inline' });
}

function main() {
  logger.info('Initializing...\n', { context: 'Watcher', format: 'inline' });
  const targetToTestPathsMap = buildTestMap();

  printInstrumentation(targetToTestPathsMap);

  const watcher = chokidar.watch(`${srcRoot}/**/*.js`, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher
    .on('ready', () =>
      logger.info('Ready. Watching for file changes...\n', {
        context: 'Watcher',
        format: 'inline',
      }),
    )
    .on('change', (filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      const baseName = path.basename(filePath, '.js');
      logger.warn(`\nFile changed: ${relativePath} (Basename: ${baseName})\n`, {
        context: 'Watcher',
        format: 'inline',
      });
      const testPathsInfo = targetToTestPathsMap.get(baseName);
      runTests(testPathsInfo);
    });
}

main();
