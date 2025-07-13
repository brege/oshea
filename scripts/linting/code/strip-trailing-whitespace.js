#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js

require('module-alias/register');

const path = require('path');
const fs = require('fs');
const { fileHelpersPath } = require('@paths');
const { getPatternsFromArgs, getDefaultGlobIgnores } = require(fileHelpersPath);

/**
 * Recursively find all files matching the given glob patterns, honoring ignore patterns.
 */
function findMatchingFiles(patterns, ignore) {
  const glob = require('glob');
  const files = new Set();
  for (const pattern of patterns) {
    glob.sync(pattern, { ignore, dot: true }).forEach(f => files.add(f));
  }
  return Array.from(files);
}

const patterns = getPatternsFromArgs(process.argv.slice(2));
const ignore = getDefaultGlobIgnores();

const files = findMatchingFiles(patterns, ignore);

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const cleaned = content.replace(/[ \t]+$/gm, '');
  if (content !== cleaned) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Stripped: ${path.relative(process.cwd(), filePath)}`);
  }
});

