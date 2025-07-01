// scripts/linting/strip-trailing-whitespace.js

const fs = require('fs');
const path = require('path');

// Recursively yield all file paths from a directory
function* getAllFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* getAllFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function stripTrailingWhitespace(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const cleaned = content.replace(/[ \t]+$/gm, '');
  if (content !== cleaned) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Stripped: ${filePath}`);
  }
}

function processPath(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const file of getAllFiles(p)) {
      if (file.endsWith('.js')) stripTrailingWhitespace(file);
    }
  } else if (stat.isFile() && p.endsWith('.js')) {
    stripTrailingWhitespace(p);
  }
}

// Entry point: process all arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node strip-trailing-whitespace.js <fileOrDir> [moreFilesOrDirs...]');
  process.exit(1);
}
for (const arg of args) {
  processPath(path.resolve(arg));
}

