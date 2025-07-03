// scripts/refactor/@paths/probe/scan-path-usage.js

// This script scans a directory for files that use pathing patterns
// of the type that are NOT in require(), path.join(), or path.resolve().

const path = require('path');
const fs = require('fs');
const { findFiles } = require('../../../shared/file-helpers');

// Regexes for various pathing patterns
const patterns = [
  // 1. String concatenation with / or \
  { desc: 'String concatenation with / or \\', regex: /(['"`][^'"`]*['"`]\s*\+\s*['"`][^'"`]*[\\/][^'"`]*['"`])/ },

  // 2. path.X where X != resolve/join
  { desc: 'path.X (not resolve/join)', regex: /path\.(?!resolve\b|join\b)[a-zA-Z_]+\s*\(/ },

  // 3. process.env usage
  { desc: 'process.env usage', regex: /process\.env\.[A-Z0-9_]+/ },

  // 4. import.meta.url or fileURLToPath
  { desc: 'import.meta.url or fileURLToPath', regex: /(import\.meta\.url|fileURLToPath)/ },

  // 5. Dynamic require/import
  { desc: 'Dynamic require/import', regex: /(require\(\s*[^'"][^)]*\)|import\(\s*[^'"][^)]*\))/ },
];

function scanFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    patterns.forEach(({ desc, regex }) => {
      if (regex.test(line)) {
        console.log(`[${desc}] ${file}:${i + 1}: ${line.trim()}`);
      }
    });
  });
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    console.error('Usage: node scripts/scan-path-usage.js <dir-or-file> [<dir-or-file> ...]');
    process.exit(1);
  }

  for (const inputPath of argv) {
    for (const file of findFiles(inputPath, {
      filter: (name) => name.endsWith('.js') || name.endsWith('.mjs'),
    })) {
      scanFile(file);
    }
  }
}

if (require.main === module) {
  main();
}
