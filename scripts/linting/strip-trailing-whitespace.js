#!/usr/bin/env node
// scripts/linting/strip-trailing-whitespace.js

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
  const content = fs.readFileSync(filePath, 'utf8');
  const cleaned = content.replace(/[ \t]+$/gm, '');
  if (content !== cleaned) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Stripped: ${path.relative(process.cwd(), filePath)}`);
  }
});

