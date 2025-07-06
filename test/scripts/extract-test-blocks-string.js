// test/scripts/extract-test-blocks-string.js
const fs = require('fs');

// --- Argument Parsing ---
if (process.argv.length < 4) {
  console.error('Usage: node extract-blocks.js <search-string> <file1.md> [file2.md ...]');
  process.exit(1);
}

const SEARCH_STRING = process.argv[2];
const FILES = process.argv.slice(3);
const SEARCH_REGEX = new RegExp(SEARCH_STRING, 'i');

// --- Helpers ---
function isChecklistLine(line) {
  return /^\*\s*\[.\]\s/.test(line);
}
function isHeading(line) {
  return /^#{2,}/.test(line);
}

function extractBlocks(content, regex) {
  const lines = content.split('\n');
  const blocks = [];
  let block = [];
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isChecklistLine(line)) {
      // Save previous block if it matches
      if (block.length && block.some(l => regex.test(l))) {
        blocks.push(block.join('\n'));
      }
      block = [line];
      inBlock = true;
    } else if (inBlock && (line.trim() === '' || line.startsWith('  ') || line.startsWith('    ') || line.startsWith('- '))) {
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
  // Last block
  if (block.length && block.some(l => regex.test(l))) {
    blocks.push(block.join('\n'));
  }
  return blocks;
}

// --- Main ---
FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.warn(`File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  const blocks = extractBlocks(content, SEARCH_REGEX);
  if (blocks.length) {
    console.log(`\n=== Blocks from ${file} matching "${SEARCH_STRING}" ===\n`);
    blocks.forEach(block => {
      console.log(block);
      console.log('---');
    });
  }
});

