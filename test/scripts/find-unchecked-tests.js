// test/scripts/find-unchecked-tests.js
const fs = require('fs');
const path = require('path');

// For test file inference
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
function buildTestIdToPathMap() {
  const dirs = [
    path.join(__dirname, '../integration'),
    path.join(__dirname, '../e2e'),
  ];
  const testIdToPath = {};
  dirs.forEach(dir => {
    findAllJsFiles(dir).forEach(file => {
      const match = file.match(/\.test\.((?:\d+\.)*\d+)\.js$/);
      if (match) {
        const testId = match[1];
        const idx = file.lastIndexOf('/test/');
        const relPath = idx !== -1 ? file.slice(idx + 1) : file;
        testIdToPath[testId] = relPath;
      }
    });
  });
  return testIdToPath;
}
const testIdToPath = buildTestIdToPathMap();

const DOCS_DIR = path.join(__dirname, '../docs');
const checklistFiles = fs.readdirSync(DOCS_DIR)
  .filter(f => /^checklist-level-\d+\.md$/.test(f))
  .map(f => path.join(DOCS_DIR, f));

const openTests = [];
for (const file of checklistFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const checklistMatch = lines[i].match(/^\*\s*\[\s*\]\s+(\d+\.\d+\.\d+)/);
    if (checklistMatch) {
      const testId = checklistMatch[1];
      let isOpen = false;
      let testTarget = '';
      // Look ahead for status and test_target
      for (let j = i + 1; j < lines.length; j++) {
        const statusLine = lines[j].trim();
        if (statusLine.startsWith('- **status:**') && statusLine.match(/OPEN/i)) {
          isOpen = true;
        }
        const targetMatch = lines[j].match(/- \*\*test_target:\*\*\s*(.*)/);
        if (targetMatch) {
          testTarget = targetMatch[1].trim();
        }
        if (lines[j].startsWith('* [')) break;
      }
      if (isOpen) {
        openTests.push({ testId, testTarget, testPath: testIdToPath[testId] || '' });
      }
    }
  }
}
openTests.forEach(({ testId, testTarget, testPath }) => {
  // testId (8 cols), testTarget (18 cols), testPath
  const tid = (testId || '').padEnd(8);
  const tgt = (testTarget || '').padEnd(18);
  // Add two spaces between columns 2 and 3 for clarity
  console.log(`${tid}${tgt}  ${testPath}`);
});
