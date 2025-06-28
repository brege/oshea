// test/scripts/ls-matching-tests.js
const fs = require('fs');
const glob = require('glob');

// --- Argument Parsing ---
if (process.argv.length < 4) {
  console.error('Usage: node ls-matching-tests.js <search-string> <file1.md> [file2.md ...]');
  process.exit(1);
}

const SEARCH_STRING = process.argv[2];
const FILES = process.argv.slice(3);
const SEARCH_REGEX = new RegExp(SEARCH_STRING, 'i');

function isChecklistLine(line) {
  return /^\*\s*\[.\]\s/.test(line);
}
function isHeading(line) {
  return /^#{2,}/.test(line);
}
function extractTestId(block) {
  const match = block.match(/- \*\*test_id:\*\* ([\d.]+)/);
  return match ? match[1] : null;
}
function findTestFiles(test_id) {
  if (!test_id) return [];
  const integrationPattern = `test/integration/*/*.test.${test_id}.js`;
  return glob.sync(integrationPattern);
}

function extractBlocks(content, regex) {
  const lines = content.split('\n');
  const blocks = [];
  let block = [];
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isChecklistLine(line)) {
      if (block.length && block.some(l => regex.test(l))) {
        blocks.push(block.join('\n'));
      }
      block = [line];
      inBlock = true;
    } else if (
      inBlock &&
      (line.trim() === '' ||
        line.startsWith('  ') ||
        line.startsWith('    ') ||
        line.startsWith('- '))
    ) {
      block.push(line);
    } else if (isHeading(line)) {
      if (block.length && block.some(l => regex.test(l))) {
        blocks.push(block.join('\n'));
      }
      block = [];
      inBlock = false;
    } else {
      if (block.length && block.some(l => regex.test(l))) {
        blocks.push(block.join('\n'));
      }
      block = [];
      inBlock = false;
    }
  }
  if (block.length && block.some(l => regex.test(l))) {
    blocks.push(block.join('\n'));
  }
  return blocks;
}

const foundFiles = new Set();

FILES.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const blocks = extractBlocks(content, SEARCH_REGEX);
  blocks.forEach(block => {
    const test_id = extractTestId(block);
    const testFiles = findTestFiles(test_id);
    testFiles.forEach(f => foundFiles.add(f));
  });
});

// Output all unique paths, one per line
[...foundFiles].forEach(f => console.log(f));

