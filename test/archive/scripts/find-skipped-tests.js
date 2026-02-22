// test/archive/scripts/find-skipped-tests.js
require('module-alias/register');
const { integrationTestDir, e2eTestDir, loggerPath } = require('@paths');

const fs = require('node:fs');
const path = require('node:path');

const logger = require(loggerPath);

const TEST_DIRS = [integrationTestDir, e2eTestDir];

function findAllJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findAllJsFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}
function extractTestCode(filename) {
  const match = filename.match(/\.test\.((?:\d+\.)*\d+)\.js$/);
  return match ? match[1] : '';
}
function getRelativePath(file) {
  const idx = file.lastIndexOf('/test/');
  return idx !== -1 ? file.slice(idx + 1) : file;
}

const filesWithItSkip = [];
for (const dir of TEST_DIRS) {
  findAllJsFiles(dir).forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const skips = (content.match(/it\.skip\s*\(/g) || []).length;
    if (skips > 0) {
      filesWithItSkip.push({
        testCode: extractTestCode(file),
        relPath: getRelativePath(file),
        skips,
      });
    }
  });
}
filesWithItSkip.forEach(({ testCode, relPath, skips }) => {
  const tid = (testCode || '').padEnd(8);
  const skipCol = `${skips} it.skip()`.padEnd(12);
  logger.info(`${tid}${skipCol}${relPath}`);
});
