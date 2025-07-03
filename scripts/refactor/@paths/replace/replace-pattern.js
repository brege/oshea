#!/usr/bin/env node
// scripts/refactor/@paths/replace/replace-pattern.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// --- Argument Parsing ---
const [filePattern, searchRegexStr, replacementString] = process.argv.slice(2);

if (!filePattern || !searchRegexStr || replacementString === undefined) {
  console.error('Usage: node scripts/refactor/replace-pattern.js "<file_pattern>" "<search_regex>" "<replacement_string>"');
  console.error('Example: node scripts/refactor/replace-pattern.js "src/**/*.js" "^.*const cliPath =.*" "const { cliPath } = require(\'@paths\');"');
  process.exit(1);
}

// --- Main Logic ---
const searchRegex = new RegExp(searchRegexStr);
const files = glob.sync(filePattern, { nodir: true });

if (files.length === 0) {
    console.log(`[INFO] No files found matching pattern: "${filePattern}"`);
    process.exit(0);
}

console.log(`[INFO] Checking ${files.length} files matching "${filePattern}"...`);

files.forEach(file => {
  const originalContent = fs.readFileSync(file, 'utf8');
  const lines = originalContent.split('\n');
  let changed = false;

  const newLines = lines.map(line => {
    if (searchRegex.test(line)) {
      changed = true;
      // Capture the leading whitespace (the indentation) of the original line
      const indentMatch = line.match(/^\s*/);
      const indentation = indentMatch ? indentMatch[0] : '';
      // Return the new string with the original indentation
      return indentation + replacementString;
    }
    return line;
  });

  if (changed) {
    console.log(`[MODIFIED] ${file}`);
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  }
});

console.log('[INFO] Replacement script finished.');
