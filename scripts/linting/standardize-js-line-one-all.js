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
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const lines = originalContent.split('\n');

  let changed = false;

  if (lines[0].startsWith('#!')) {
    // Shebang present
    if (lines[1]?.startsWith('//')) {
      if (lines[1] !== `// ${relPath}`) {
        lines[1] = `// ${relPath}`;
        changed = true;
      }
    } else {
      lines.splice(1, 0, `// ${relPath}`);
      changed = true;
    }
  } else {
    if (lines[0]?.startsWith('//')) {
      if (lines[0] !== `// ${relPath}`) {
        lines[0] = `// ${relPath}`;
        changed = true;
      }
    } else {
      lines.unshift(`// ${relPath}`);
      changed = true;
    }
  }

  if (changed) {
    const newContent = lines.join('\n');
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Standardized: ${relPath}`);
    }
  }
});
