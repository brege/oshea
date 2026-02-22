// scripts/docs/generate-toc.js
require('module-alias/register');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

const fs = require('fs');

// GitHub anchor generator
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{}\\|;:'",.<>/?]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Parse TOC block
function parseTocBlock(lines) {
  const toc = {};
  lines.forEach((line) => {
    const match = line.match(/\[([^\]]+)]\(#([^)]+)\)/);
    if (match) {
      toc[match[2]] = { text: match[1], raw: line };
    }
  });
  return toc;
}

// Find TOC block indices and extract level from marker
function findTocBlockIndices(lines) {
  let start = -1,
    end = -1,
    level = 4;
  for (let i = 0; i < lines.length; ++i) {
    if (start === -1 && /toc-start/i.test(lines[i])) {
      start = i;
      const match = lines[i].match(/level-(\d+)/i);
      if (match) level = parseInt(match[1], 10);
    } else if (start !== -1 && /toc-end/i.test(lines[i])) {
      end = i;
      break;
    }
  }
  return [start, end, level];
}

// Parse CLI args for -L flag
function parseArgs() {
  const args = process.argv.slice(2);
  let filePath = null,
    maxLevel = null,
    help = false;
  for (let i = 0; i < args.length; ++i) {
    if (args[i] === '-L' || args[i] === '--level') {
      maxLevel = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].match(/^-L\d+$/)) {
      maxLevel = parseInt(args[i].slice(2), 10);
    } else if (args[i] === '--help' || args[i] === '-h') {
      help = true;
    } else if (!args[i].startsWith('-')) {
      filePath = args[i];
    }
  }
  return { filePath, maxLevel, help };
}

// Parse headings only after TOC start line
function parseHeadings(lines, startLine) {
  return lines
    .slice(startLine + 1)
    .map((line, idx) => {
      const heading = line.match(/^(#+)\s+(.+)/);
      if (heading) {
        return {
          level: heading[1].length,
          text: heading[2].replace(/[*_~`]+/g, '').trim(),
          anchor: slugify(heading[2].replace(/[*_~`]+/g, '').trim()),
          idx: idx + startLine + 1,
        };
      }
      return null;
    })
    .filter(Boolean);
}

// Print help/usage message
function printHelp() {
  logger.info(`
oshea TOC generator

Usage:
  node generate-toc.js [-L4|--level 3] [--help] <markdown-file>

Inserts or updates a Table of Contents block in the specified markdown file.
The TOC block must be delimited like this:

  <!-- toc-start level-4 -->
  (generated list)
  <!-- toc-end -->

Options:
  -L, --level [N]    Max header depth for toc entries (e.g. -L3 or --level 3)
  -h, --help         Show this help and exit

Example:
  node scripts/docs/generate-toc.js -L3 README.md
  `);
}

// Main
const { filePath, maxLevel: cliLevel, help } = parseArgs();
if (help) {
  printHelp();
  process.exit(0);
}
if (!filePath) {
  printHelp();
  process.exit(1);
}
const md = fs.readFileSync(filePath, 'utf8');
const lines = md.split('\n');

const [tocStart, tocEnd, markerLevel] = findTocBlockIndices(lines);
const tocLines =
  tocStart !== -1 && tocEnd !== -1 && tocEnd > tocStart
    ? lines.slice(tocStart + 1, tocEnd)
    : [];
const tocMap = parseTocBlock(tocLines);

// Only parse headings after TOC start (or from 0 if no TOC)
const headings =
  tocStart !== -1 ? parseHeadings(lines, tocStart) : parseHeadings(lines, -1);

// Determine maxLevel: CLI flag > marker > default
const maxLevel = cliLevel || markerLevel || 4;
const baseLevel = 3;

// Build new TOC
const output = [];
headings.forEach((h) => {
  if (h.level > maxLevel) return;
  const indent = '  '.repeat(Math.max(0, h.level - baseLevel));
  const anchor = h.anchor;
  let line;
  if (Object.hasOwn(tocMap, anchor)) {
    line = `${indent}- [ ] [${tocMap[anchor].text}](#${anchor})`;
  } else {
    line = `${indent}- [ ] [${h.text}](#${anchor})`;
  }
  output.push(line);
});

// Insert or replace TOC block in document
let newLines;
if (tocStart !== -1 && tocEnd !== -1 && tocEnd > tocStart) {
  // Replace existing TOC block
  newLines = [
    ...lines.slice(0, tocStart + 1),
    ...output,
    ...lines.slice(tocEnd),
  ];
} else {
  // No TOC found: insert at top
  newLines = [
    `<!-- toc-start level-${maxLevel} -->`,
    ...output,
    '<!-- toc-end -->',
    '',
    ...lines,
  ];
}

// Write back to file
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
logger.info(
  `TOC updated in ${filePath} (up to level ${maxLevel}, baseLevel ${baseLevel})`,
);
