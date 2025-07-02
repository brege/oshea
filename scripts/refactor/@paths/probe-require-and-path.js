#!/usr/bin/env node
// scripts/refactor/probe-require-and-path.js

// This script scans a directory for files that use pathing patterns
// of the type that ARE in require(), path.join(), or path.resolve().


const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { getPatternsFromArgs, getDefaultGlobIgnores } = require('../../shared/file-helpers');

// --- Configuration & CLI Argument Parsing ---
const PROJECT_ROOT = process.cwd();
const cliArgs = process.argv.slice(2);

const showRejects = cliArgs.includes('--rejects');
const filterByBasename = cliArgs.includes('--only-basenames');

const nonPatternArgs = ['--rejects', '--only-basenames'];
const patterns = getPatternsFromArgs(cliArgs.filter(arg => !nonPatternArgs.includes(arg)));
const ignore = getDefaultGlobIgnores();

if (patterns.length === 0) {
  console.log("Usage: node scripts/refactor/probe-require-and-path.js [--rejects] [--only-basenames] <file_or_directory>");
  process.exit(1);
}

// --- Main Logic ---

let basenameIndex = new Set();
if (filterByBasename) {
  console.log('[INFO] --only-basenames flag detected. Building basename index from src/ directory...');
  const basenameSourceFiles = glob.sync('src/**/*.js', { ignore, dot: true });
  for (const file of basenameSourceFiles) {
    basenameIndex.add(path.basename(file, '.js'));
  }
  console.log(`[INFO] Index complete. Found ${basenameIndex.size} unique basenames.`);
}

const files = patterns.flatMap(pattern =>
  glob.sync(pattern, { ignore, dot: true, nodir: true })
);

files.forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  const fileContent = fs.readFileSync(file, 'utf8');
  const lines = fileContent.split('\n');

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    let type = '';
    let isPackageRequire = false;
    let hasBasename = false;

    if (trimmedLine.startsWith('//')) return; // Simple comment skip

    // --- IDENTIFY CANDIDATE LINES ---
    if (trimmedLine.includes('require(')) {
      const requireMatch = trimmedLine.match(/require\((['"`])(.*?)\1\)/);
      if (requireMatch && requireMatch[2]) {
        const requiredPath = requireMatch[2];
        if (requiredPath.startsWith('.') || path.isAbsolute(requiredPath)) {
          type = 'REQUIRE';
        } else {
          isPackageRequire = true;
          type = 'REJECTED_PACKAGE';
        }
      }
    } else if (trimmedLine.includes('path.join(')) {
      type = 'JOIN';
    } else if (trimmedLine.includes('path.resolve(')) {
      type = 'RESOLVE';
    }

    if (!type) return; // Not a line we are interested in

    // --- APPLY BASENAME FILTER (if enabled) ---
    if (filterByBasename && !isPackageRequire) {
        // Iterate through all known basenames
        for (const basename of basenameIndex) {
            // A simple string check is sufficient and matches the goal.
            if (trimmedLine.includes(basename)) {
                hasBasename = true;
                break; // Found a match, no need to check further
            }
        }
        // If after checking all basenames, none were found, mark it for rejection.
        if (!hasBasename) {
            type = 'REJECTED_NO_BASENAME';
        }
    }

    // --- OUTPUT LOGIC ---
    if (showRejects) {
      if (isPackageRequire || type === 'REJECTED_NO_BASENAME') {
        console.log(`[${type}] ${relativePath}:${index + 1}: ${trimmedLine}`);
      }
    } else {
      if (!isPackageRequire && type !== 'REJECTED_NO_BASENAME') {
        console.log(`[${type}] ${relativePath}:${index + 1}: ${trimmedLine}`);
      }
    }
  });
});
