#!/usr/bin/env node
// scripts/linting/standardize-js-line-one-all.js

const path = require('path');
const fs = require('fs');
const glob = require('glob');
const { getPatternsFromArgs, getDefaultGlobIgnores } = require('../shared/file-helpers');

const patterns = getPatternsFromArgs(process.argv.slice(2));
const ignore = getDefaultGlobIgnores();

const files = patterns.flatMap(pattern =>
  glob.sync(pattern, { ignore, dot: true })
);

files.forEach(filePath => {
  const relPath = path.relative(process.cwd(), filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  if (lines[0].startsWith('#!')) {
    // Shebang present
    if (lines[1]?.startsWith('//')) {
      lines[1] = `// ${relPath}`;
    } else {
      lines.splice(1, 0, `// ${relPath}`);
    }
  } else {
    if (lines[0]?.startsWith('//')) {
      lines[0] = `// ${relPath}`;
    } else {
      lines.unshift(`// ${relPath}`);
    }
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Standardized: ${relPath}`);
});

