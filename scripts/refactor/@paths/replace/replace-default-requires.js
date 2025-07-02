// scripts/refactor/replace-default-requires.js

const path = require('path');
const fs = require('fs');
const { findFiles } = require('../shared/file-helpers');
const { classifyRequireLine } = require('./require-classifier');

// 1. Load all anchors from paths.js
const paths = require('../../paths.js');
const anchorMap = {};
for (const [anchor, absPath] of Object.entries(paths)) {
  if (typeof absPath === 'string' && absPath.endsWith('.js')) {
    anchorMap[path.resolve(absPath)] = anchor;
  }
}

// 2. Regex for default require
const defaultRequireRegex = /^const\s+(\w+)\s*=\s*require\((['"`])(.*?)\2\);?/;

// 3. Find where to insert the anchor import
function findInsertIndex(lines) {
  let idx = 0;
  // Shebang?
  if (lines[0] && lines[0].startsWith('#!')) idx++;
  // Head comment? (e.g. // src/foo/bar.js)
  if (lines[idx] && lines[idx].match(/^\/\/\s*[\w/.\-]+\.js/)) idx++;
  return idx;
}

// 4. Allow custom roots (src, test, or both)
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];

for (const root of roots) {
  for (const file of findFiles(root, {
    filter: fname => fname.endsWith('.js') || fname.endsWith('.mjs'),
  })) {
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    let changed = false;
    let anchorsNeeded = new Set();

    lines = lines.map((line) => {
      const match = line.match(defaultRequireRegex);
      if (!match) return line;

      // Use the classifier to skip package/builtin requires
      const classification = classifyRequireLine(line);
      if (!classification || classification.type !== 'pathlike') {
        // Not a pathlike require, skip rewrite
        return line;
      }

      const reqPath = match[3];
      let absTarget = path.resolve(path.dirname(file), reqPath);
      let anchor = null;

      // Node-like resolution order:
      // 1. If it's a file (with or without .js)
      if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile()) {
        anchor = anchorMap[absTarget];
      }
      if (!anchor && fs.existsSync(absTarget + '.js') && fs.statSync(absTarget + '.js').isFile()) {
        anchor = anchorMap[absTarget + '.js'];
      }
      // 2. If it's a directory, try index.js inside it
      if (!anchor && fs.existsSync(absTarget) && fs.statSync(absTarget).isDirectory()) {
        const indexJs = path.join(absTarget, 'index.js');
        if (fs.existsSync(indexJs) && fs.statSync(indexJs).isFile()) {
          anchor = anchorMap[indexJs];
        }
      }

      if (!anchor) {
        // Only warn for pathlike requires
        console.warn(`[NO ANCHOR] ${file}: ${line.trim()}  -->  ${absTarget}`);
        return line;
      }

      anchorsNeeded.add(anchor);
      changed = true;
      // Replace with anchor
      return line.replace(/require\((['"`])(.*?)\1\)/, `require(${anchor})`);
    });

    if (changed && anchorsNeeded.size > 0) {
      // Remove any old destructured @paths import
      lines = lines.filter(l => !l.match(/^const\s+\{[^}]+\}\s*=\s*require\(['"]@paths['"]\);/));

      // Insert new destructured @paths import at the right spot
      const anchorLine = `const { ${Array.from(anchorsNeeded).join(', ')} } = require('@paths');`;
      const insertIdx = findInsertIndex(lines);
      lines.splice(insertIdx, 0, anchorLine);

      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      console.log(`Refactored: ${file}`);
    }
  }
}

