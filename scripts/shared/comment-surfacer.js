#!/usr/bin/env node
// scripts/shared/comment-surfacer.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const { findFiles, getDefaultGlobIgnores } = require('./file-helpers');

// Patterns to match in comments
const COMMENT_PATTERNS = [
  /MODIFIED/i,
  /REMOVE/i,
  /Correct/i,
  /\bYour\b/i,
  /FIX.*/i,
  /<--/i,
  // Add more patterns here as needed
];

// Parse CLI args for --rng N and --all
const inputArgs = process.argv.slice(2);
let rngIndex = inputArgs.indexOf('--rng');
let rngCount = 0;
if (rngIndex !== -1) {
  rngCount = parseInt(inputArgs[rngIndex + 1], 10) || 0;
  inputArgs.splice(rngIndex, 2); // Remove --rng and N from args
}
const allFlag = inputArgs.includes('--all');
if (allFlag) {
  inputArgs.splice(inputArgs.indexOf('--all'), 1);
}
const ignoreDirs = getDefaultGlobIgnores();

let totalHits = 0;
let scannedFiles = 0;
let allComments = [];

function colorLine(file, line, text) {
  return (
    chalk.cyan(file) +
    ':' +
    chalk.yellow(line) +
    ':' +
    chalk.whiteBright(text)
  );
}

function processFile(filePath, collectAll = false, dumpAll = false) {
  scannedFiles++;
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    return;
  }
  const lines = content.split('\n');
  for (let idx = 2; idx < lines.length; idx++) {
    const line = lines[idx];
    const commentIdx = line.indexOf('//');
    if (commentIdx === -1) continue;
    if (collectAll) {
      allComments.push({
        file: path.relative(process.cwd(), filePath),
        line: idx + 1,
        text: line.trim()
      });
    } else if (dumpAll) {
      const relPath = path.relative(process.cwd(), filePath);
      console.log(colorLine(relPath, idx + 1, line.trim()));
      totalHits++;
    } else {
      const comment = line.slice(commentIdx);
      for (const regex of COMMENT_PATTERNS) {
        if (regex.test(comment)) {
          totalHits++;
          const relPath = path.relative(process.cwd(), filePath);
          console.log(colorLine(relPath, idx + 1, line.trim()));
          break;
        }
      }
    }
  }
}

if (inputArgs.length === 0) inputArgs.push('src'); // default

for (const arg of inputArgs) {
  // If arg is a directory, walk it with findFiles
  if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
    for (const filePath of findFiles(arg, {
      ignores: ignoreDirs,
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
    })) {
      processFile(filePath, rngCount > 0, allFlag);
    }
  } else {
    // Otherwise, treat as a glob
    for (const filePath of glob.sync(arg, { ignore: ignoreDirs, nodir: true })) {
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        processFile(filePath, rngCount > 0, allFlag);
      }
    }
  }
}

if (rngCount > 0) {
  if (allComments.length === 0) {
    console.log('No comments found!');
  } else {
    // Shuffle and pick N
    for (let i = allComments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allComments[i], allComments[j]] = [allComments[j], allComments[i]];
    }
    const chosen = allComments.slice(0, rngCount);
    chosen.forEach(c =>
      console.log(colorLine(c.file, c.line, c.text))
    );
    console.log(
      chalk.green(
        `\nRandom comments shown: ${chosen.length} / ${allComments.length} total.`
      )
    );
  }
} else if (scannedFiles === 0) {
  console.warn('No files found to scan. Pass a directory (e.g. src, test) or a valid glob.');
} else if (totalHits === 0) {
  console.log('No matching comments found!');
} else if (allFlag) {
  console.log(
    chalk.green(`\nTotal comments found: ${totalHits}`)
  );
} else {
  console.log(
    chalk.green(`\nTotal matching comments found: ${totalHits}`)
  );
}

