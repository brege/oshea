#!/usr/bin/env node
// scripts/shared/logger-surfacer.js
// lint-skip-file no-console

require('module-alias/register');
const { fileHelpersPath } = require('@paths');
const { findFilesArray, getDefaultGlobIgnores } = require(fileHelpersPath);

const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

// Logger levels to detect
const LOG_LEVELS = ['info', 'debug', 'warn', 'error', 'fatal', 'success', 'detail', 'validation'];

// Parse CLI args: --only=filename, --info, --warn ..., --stats, --no-stats
function parseArgs(argv) {
  let onlyMatchingFrom = null;
  let showStatsOnly = false;
  let suppressStats = false;
  const levelsFilter = new Set();
  const filesOrGlobs = [];

  for (const arg of argv) {
    if (arg.startsWith('--only=')) {
      onlyMatchingFrom = arg.split('=', 2)[1];
    } else if (arg === '--stats') {
      showStatsOnly = true;
    } else if (arg === '--no-stats') {
      suppressStats = true;
    } else if (arg.startsWith('--')) {
      const level = arg.replace(/^--/, '');
      if (LOG_LEVELS.includes(level)) {
        levelsFilter.add(level);
      } else {
        console.error(`Unknown flag: ${arg}`);
        process.exit(1);
      }
    } else {
      filesOrGlobs.push(arg);
    }
  }
  return { onlyMatchingFrom, showStatsOnly, suppressStats, levelsFilter, filesOrGlobs };
}

function buildLoggerRegex(levels) {
  const levelsGroup = levels.length ? levels.join('|') : LOG_LEVELS.join('|');
  return new RegExp(`logger\\.(${levelsGroup})\\s*\\(`);
}

function highlightStrings(line) {
  return line.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, match => chalk.cyanBright(match));
}

function highlightKeys(line) {
  return line.replace(/(\b\w+)(:)/g, (_, key, colon) => chalk.yellowBright(key) + colon);
}

function matchLoggerBlock(linesBuffer, matcherSet) {
  if (!matcherSet) return true;
  const full = linesBuffer.join(' ');
  const match = full.match(/(['"])(.*?)\1/);
  if (!match) return false;
  const logmsg = match[2].trim();
  for (const msg of matcherSet) {
    if (logmsg.includes(msg)) return true;
  }
  return false;
}

function printMatch(filePath, startLine, linesBuffer) {
  const coloredPath = chalk.magentaBright(`// ${filePath}`); // copy-pastable
  const coloredLine = chalk.hex('#FFA500')(startLine.toString());
  console.log(`${coloredPath}:${coloredLine}`);
  const firstLine = linesBuffer[0];
  const indentMatch = firstLine.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : '';
  for (const line of linesBuffer) {
    let trimmedLine = line.startsWith(baseIndent) ? line.slice(baseIndent.length) : line;
    trimmedLine = highlightKeys(trimmedLine);
    trimmedLine = highlightStrings(trimmedLine);
    console.log(trimmedLine);
  }
  console.log('');
}

async function surfaceLoggerCalls(filePath, stats, matcherSet, levelsFilter, showStatsOnly) {
  const levelsArray = Array.from(levelsFilter);
  const loggerRegex = buildLoggerRegex(levelsArray);

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let capturing = false;
  let buffer = [];
  let parenDepth = 0;
  let currentLogLevel = null;

  for await (const line of rl) {
    lineNumber++;

    if (!capturing) {
      const match = line.match(loggerRegex);
      if (match) {
        capturing = true;
        buffer = [];
        parenDepth = 0;
        currentLogLevel = match[1];

        // Defensive check (should not be needed as regex filters levels)
        if (levelsFilter.size && !levelsFilter.has(currentLogLevel)) continue;

        // Update stats always
        if (!stats[filePath]) stats[filePath] = {};
        stats[filePath][currentLogLevel] = (stats[filePath][currentLogLevel] || 0) + 1;

        const idx = line.indexOf(match[0]);
        const afterLoggerCall = line.slice(idx);
        parenDepth += (afterLoggerCall.match(/\(/g) || []).length;
        parenDepth -= (afterLoggerCall.match(/\)/g) || []).length;

        buffer.push(line);

        if (parenDepth <= 0) {
          if (matchLoggerBlock(buffer, matcherSet)) {
            if (!showStatsOnly) {
              printMatch(filePath, lineNumber, buffer);
            }
          }
          capturing = false;
          buffer = [];
          currentLogLevel = null;
        }
        continue;
      }
    } else {
      parenDepth += (line.match(/\(/g) || []).length;
      parenDepth -= (line.match(/\)/g) || []).length;

      buffer.push(line);

      if (parenDepth <= 0) {
        if (matchLoggerBlock(buffer, matcherSet)) {
          if (!showStatsOnly) {
            printMatch(filePath, lineNumber - buffer.length + 1, buffer);
          }
        }
        capturing = false;
        buffer = [];
        currentLogLevel = null;
      }
    }
  }
}

function printStats(stats, levelsFilter) {
  console.log(chalk.bold('\nLogging call statistics per file:'));
  for (const [file, counts] of Object.entries(stats)) {
    console.log(chalk.whiteBright(file));
    for (const level of LOG_LEVELS) {
      if ((!levelsFilter.size || levelsFilter.has(level)) && counts[level]) {
        console.log(chalk.grey(`  ${level}: ${counts[level]}`));
      }
    }
    console.log('');
  }
}

async function main() {
  const { onlyMatchingFrom, showStatsOnly, suppressStats, levelsFilter, filesOrGlobs } = parseArgs(process.argv.slice(2));
  if (filesOrGlobs.length === 0) {
    console.error('Usage: logger-surfacer.js <file|dir|glob> [--only=file] [--stats] [--no-stats] [--info] [--warn] ...');
    process.exit(1);
  }
  let matcherSet = null;
  if (onlyMatchingFrom) {
    try {
      const lines = fs.readFileSync(onlyMatchingFrom, 'utf8')
        .split('\n').map(s => s.trim()).filter(Boolean);
      matcherSet = new Set(lines);
      if (!lines.length) {
        console.error(`Warning: matcher file ${onlyMatchingFrom} is empty!`);
        matcherSet = null;
      }
    } catch (err) {
      console.error(`Failed to read only file ${onlyMatchingFrom}:`, err);
      process.exit(1);
    }
  }
  const files = findFilesArray(filesOrGlobs, {
    ignores: getDefaultGlobIgnores(),
    filter: (name) => name.endsWith('.js') || name.endsWith('.mjs'),
  });
  const stats = {};
  for (const file of files) {
    await surfaceLoggerCalls(file, stats, matcherSet, levelsFilter, showStatsOnly);
  }
  if (!suppressStats) {
    printStats(stats, levelsFilter);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

