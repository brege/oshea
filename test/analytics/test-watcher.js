// test/analytics/test-watcher.js
require('module-alias/register');

const { projectRoot, srcRoot, loggerPath } = require('@paths');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const glob = require('glob');
const logger = require(loggerPath);

const TEST_DIR = path.join(projectRoot, 'test');
const TEST_DOCS_DIR = path.join(TEST_DIR, 'docs');

function buildTestMap() {
  const targetToPathMap = new Map();
  const allTestFiles = glob.sync('test/integration/**/*.test.js', { cwd: projectRoot });

  allTestFiles.forEach(testPath => {
    const testNameMatch = path.basename(testPath).match(/^([a-zA-Z0-9_-]+)\.test\.js$/);
    if (testNameMatch) {
      const targetName = testNameMatch[1];
      if (!targetToPathMap.has(targetName)) {
        targetToPathMap.set(targetName, new Set());
      }
      targetToPathMap.get(targetName).add({ path: testPath, reason: 'Direct name match' });
    }
  });

  const checklistFiles = glob.sync('checklist-level-*.md', { cwd: TEST_DOCS_DIR });
  checklistFiles.forEach(file => {
    const content = fs.readFileSync(path.join(TEST_DOCS_DIR, file), 'utf8');
    const lines = content.split('\n');
    let currentTestId = null;
    let currentTestTarget = null;

    for (const line of lines) {
      const idMatch = line.match(/- \*\*test_id:\*\*\s*([\d.]+)/);
      if (idMatch) currentTestId = idMatch[1].trim();

      const targetMatch = line.match(/- \*\*test_target:\*\*\s*(.+)/);
      if (targetMatch) currentTestTarget = targetMatch[1].trim();

      if (line.trim() === '' || line.startsWith('* [')) {
        if (currentTestId && currentTestTarget) {
          const testFilePattern = `test/integration/**/*.test.${currentTestId}.js`;
          const foundFiles = glob.sync(testFilePattern, { cwd: projectRoot });
          if (foundFiles.length > 0) {
            if (!targetToPathMap.has(currentTestTarget)) {
              targetToPathMap.set(currentTestTarget, new Set());
            }
            foundFiles.forEach(f => targetToPathMap.get(currentTestTarget).add({ path: f, reason: `ID match (${currentTestId})` }));
          }
        }
        currentTestId = null;
        currentTestTarget = null;
      }
    }
  });

  const finalMap = new Map();
  for (const [target, pathSet] of targetToPathMap.entries()) {
    finalMap.set(target, Array.from(pathSet));
  }

  return finalMap;
}

function runTests(testPathsInfo) {
  if (!testPathsInfo || testPathsInfo.length === 0) {
    logger.warn('No tests found for the changed file.\n', { context: 'Watcher', format: 'inline' });
    return;
  }
  const testPaths = testPathsInfo.map(info => info.path);
  logger.info(`\nRunning tests:\n  - ${testPaths.join('\n  - ')}\n`, { context: 'Watcher', format: 'inline' });
  const mocha = spawn('npx', ['mocha', ...testPaths], { stdio: 'inherit', cwd: projectRoot });
  mocha.on('close', (code) => {
    logger.info(`Mocha process exited with code ${code}. Watching for next change...\n`, { context: 'Watcher', format: 'inline' });
  });
}

function printInstrumentation(map) {
  logger.info('\nWatcher Instrumentation (Source -> Tests Map):\n', { format: 'inline' });
  if (map.size === 0) {
    logger.warn('  No mappings found. Check test file names and checklists.\n', { format: 'inline' });
    return;
  }
  const sortedTargets = Array.from(map.keys()).sort();
  for (const target of sortedTargets) {
    const testPathsInfo = map.get(target);
    logger.success(`\n  ◉ ${target}\n`, { format: 'inline' });
    testPathsInfo.forEach(info =>
      logger.detail(`    └─ ${info.path} (Found via: ${info.reason})\n`, { format: 'inline' })
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
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
  });

  watcher
    .on('ready', () => logger.info('Ready. Watching for file changes...\n', { context: 'Watcher', format: 'inline' }))
    .on('change', (filePath) => {
      const relativePath = path.relative(projectRoot, filePath);
      const baseName = path.basename(filePath, '.js');
      logger.warn(`\nFile changed: ${relativePath} (Basename: ${baseName})\n`, { context: 'Watcher', format: 'inline' });
      const testPathsInfo = targetToTestPathsMap.get(baseName);
      runTests(testPathsInfo);
    });
}

main();

