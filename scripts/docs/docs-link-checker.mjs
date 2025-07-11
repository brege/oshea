#!/usr/bin/env node
// scripts/docs/docs-link-checker.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import { minimatch } from 'minimatch';

// --- Configuration ---
const ROOT_DIR_TO_SCAN = 'docs/';
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '**/test/fixtures/**',
  'docs/archive/**',
  // Add more as needed
];

// --- CLI flags ---
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const fixMode = args.includes('--fix');
const dryRun = args.includes('--dry-run');
const quiet = args.includes('--quiet');

// --- Setup ---
function findProjectRoot() {
  let currentDir = path.dirname(fileURLToPath(import.meta.url));
  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root. Make sure package.json is present.');
}
const projectRoot = findProjectRoot();
process.chdir(projectRoot);

// --- Helper Functions ---
function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
  return EXCLUDE_PATTERNS.some(pattern => minimatch(relPath, pattern));
}

function getMarkdownFiles(dir, files = []) {
  if (isExcluded(dir) || isSymlink(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (isExcluded(fullPath) || isSymlink(fullPath)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      getMarkdownFiles(fullPath, files);
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function buildFileIndex(rootDir) {
  const index = new Map();
  function walk(dir) {
    if (isExcluded(dir) || isSymlink(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (isExcluded(fullPath) || isSymlink(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const key = path.basename(entry).toLowerCase();
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(fullPath);
      }
    }
  }
  walk(rootDir);
  return index;
}

function computeRelativePath(sourceFile, targetFile) {
  const sourceDir = path.dirname(sourceFile);
  let relative = path.relative(sourceDir, targetFile);
  return relative.replace(/\\/g, '/');
}

function updateLinkInLine(lineText, oldLink, newLink) {
  // Replace only the first occurrence of the old link in the line
  return lineText.replace(oldLink, newLink);
}

function updateLinkInFile(filePath, oldLink, newLink, line) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  if (line >= 1 && line <= lines.length) {
    const lineText = lines[line - 1];
    const updatedLine = updateLinkInLine(lineText, oldLink, newLink);
    if (updatedLine !== lineText) {
      lines[line - 1] = updatedLine;
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      return true;
    }
  }
  return false;
}

// --- Main Logic ---
async function auditAndFixMarkdownLinks(filePath, fileIndex, fixMode = false, dryRun = false) {
  const brokenLinks = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const tree = remark().parse(content);
  const fileDir = path.dirname(filePath);

  visit(tree, 'link', (node) => {
    let linkUrl = node.url;
    if (!linkUrl || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(linkUrl) || linkUrl.startsWith('#')) {
      return;
    }

    // Separate anchor from link, if any
    let anchor = '';
    const anchorIndex = linkUrl.indexOf('#');
    if (anchorIndex !== -1) {
      anchor = linkUrl.substring(anchorIndex);
      linkUrl = linkUrl.substring(0, anchorIndex);
    }
    if (!linkUrl) return;

    const absolutePath = path.resolve(fileDir, linkUrl);
    if (!fs.existsSync(absolutePath)) {
      const basename = path.basename(linkUrl).toLowerCase();
      const candidates = fileIndex.get(basename) || new Set();

      if (candidates.size === 1) {
        const [targetFile] = candidates;
        let newRelativePath = computeRelativePath(filePath, targetFile) + anchor;

        // Only fix if the normalized paths (without anchor) are different
        const normalizedCurrent = path.normalize(path.resolve(fileDir, linkUrl));
        const normalizedTarget = path.normalize(path.resolve(targetFile));
        if (normalizedCurrent === normalizedTarget) {
          // Already correct, skip
          return;
        }

        brokenLinks.push({
          line: node.position?.start.line,
          oldLink: node.url,
          newLink: newRelativePath,
          resolved: targetFile
        });

        // Apply fix if in fix mode or dry-run
        if (fixMode || dryRun) {
          const contentLines = content.split('\n');
          const lineIdx = node.position.start.line - 1;
          const before = contentLines[lineIdx];
          const after = updateLinkInLine(before, node.url, newRelativePath);

          if (dryRun && !quiet) {
            console.log(`\n[DRY-RUN] Would fix in ${filePath} (line ${node.position.start.line}):`);
            console.log(`  - BEFORE: ${before}`);
            console.log(`  - AFTER : ${after}`);
          } else if (fixMode && !quiet) {
            const updated = updateLinkInFile(
              filePath, node.url, newRelativePath, node.position.start.line
            );
            if (updated) {
              console.log(`  ✓ Fixed: ${node.url} → ${newRelativePath} in ${filePath} (line ${node.position.start.line})`);
            }
          }
        }
      } else if (candidates.size > 1) {
        brokenLinks.push({
          line: node.position?.start.line,
          oldLink: node.url,
          candidates: Array.from(candidates),
          ambiguous: true
        });
      } else {
        brokenLinks.push({
          line: node.position?.start.line,
          oldLink: node.url,
          unresolvable: true
        });
      }
    }
  });
  return brokenLinks;
}

async function main() {
  if (!quiet) {
    console.log(`Auditing Markdown links in '${ROOT_DIR_TO_SCAN}' from project root: ${process.cwd()}`);
  }
  const mdFiles = getMarkdownFiles(ROOT_DIR_TO_SCAN);
  const fileIndex = buildFileIndex(projectRoot);

  let totalBrokenLinks = 0;
  let errorOutput = [];

  for (const file of mdFiles) {
    if (verbose && !quiet) {
      console.log(`- Scanning: ${file}`);
    }
    const brokenLinks = await auditAndFixMarkdownLinks(file, fileIndex, fixMode, dryRun);
    if (brokenLinks.length > 0) {
      let lines = [];
      lines.push(`\n[✖] Found ${brokenLinks.length} broken link(s) in ${file}:`);
      brokenLinks.forEach(item => {
        if (item.newLink) {
          if (!fixMode && !dryRun) {
            lines.push(`  - Line ${item.line}: [link](${item.oldLink}) → [should fix](${item.newLink})`);
          }
        } else if (item.ambiguous) {
          lines.push(`  - Line ${item.line}: [link](${item.oldLink}) is ambiguous. Candidates:`);
          item.candidates.forEach(c => lines.push(`    • ${c}`));
        } else {
          lines.push(`  - Line ${item.line}: [link](${item.oldLink}) - no matching file found`);
        }
      });
      errorOutput.push(lines.join('\n'));
      totalBrokenLinks += brokenLinks.length;
    }
  }

  if (totalBrokenLinks === 0) {
    if (!quiet) {
      console.log('\n---');
      console.log('Success: No broken relative links found.');
    }
  } else {
    // Always print errors, even in quiet mode
    errorOutput.forEach(block => console.log(block));
    console.log('\n---');
    console.log(`Audit Complete: Found a total of ${totalBrokenLinks} broken link(s).`);
    if ((fixMode || dryRun) && !quiet) {
      console.log(`\n${dryRun ? '[DRY-RUN] ' : ''}Auto-fix attempted for unambiguous links.`);
    }
    process.exit(1);
  }
}

main().catch(console.error);

