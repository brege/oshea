#!/usr/bin/env node
// scripts/linting/dump-code-comments.js

const fs = require('fs');
const glob = require('glob');
const { getPatternsFromArgs, getDefaultGlobIgnores } = require('../shared/file-helpers');

const patterns = getPatternsFromArgs(process.argv.slice(2));
const ignore = getDefaultGlobIgnores();

const header = `
===== Helpful Bash Commands to Remove Common Patterns =====

# To remove lines with "FIX:" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*FIX:/d' {} +

# To remove lines with "DIAGNOSTIC PROBE" or "CORRECTED:" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*\\(DIAGNOSTIC PROBE\\|CORRECTED:\\)/d' {} +

# To remove lines with "Destructure" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*Destructure/d' {} +

===== Dump of Comments =====
`;

const footer = `
===== End of Comments =====

# Add more patterns as needed:
# find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*PATTERN/d' {} +
`;

console.log(header);

let foundAny = false;

const files = patterns.flatMap(pattern =>
  glob.sync(pattern, { ignore, dot: true })
);

files.forEach(filePath => {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    return;
  }
  const lines = content.split('\n');
  let output = [];

  // Skip the first two lines
  const filteredLines = lines.slice(2);

  filteredLines.forEach((line) => {
    const trimmed = line.trim();
    const commentStart = line.indexOf('//');

    if (commentStart === -1) return; // No comment

    if (trimmed.startsWith('//')) {
      // Type Two: Only comment
      output.push(line.substring(line.indexOf('//')));
    } else {
      // Type One: Code and comment
      const code = line.substring(0, commentStart).trim();
      const comment = line.substring(commentStart);
      output.push(`# ${code}`);
      output.push(comment);
    }
  });

  if (output.length > 0) {
    foundAny = true;
    console.log(`=== ${filePath} ===`);
    console.log(output.join('\n'));
    console.log(); // Extra newline for separation
  }
});

console.log(footer);

if (!foundAny) {
  console.warn('No comments found in the specified files.');
}

