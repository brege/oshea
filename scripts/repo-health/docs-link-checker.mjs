// scripts/devel/docs-link-checker.mjs
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
  '**/test/fixtures/**', // Exclude test fixtures which may have intentionally broken links
];

// --- CLI flags ---
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// --- Setup: Robustly find and set project root ---
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

function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
  return EXCLUDE_PATTERNS.some(pattern => minimatch(relPath, pattern));
}

function getMarkdownFiles(dir, files = []) {
  if (isExcluded(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (isExcluded(fullPath)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      getMarkdownFiles(fullPath, files);
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// --- Main Logic ---

async function auditMarkdownLinks(filePath) {
    const brokenLinks = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const tree = remark().parse(content);
    const fileDir = path.dirname(filePath);

    visit(tree, 'link', (node) => {
        let linkUrl = node.url;
        // Ignore external links and self-references
        if (!linkUrl || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(linkUrl) || linkUrl.startsWith('#')) {
            return;
        }

        const anchorIndex = linkUrl.indexOf('#');
        if (anchorIndex !== -1) {
            linkUrl = linkUrl.substring(0, anchorIndex);
        }

        if (!linkUrl) {
            return;
        }

        const absolutePath = path.resolve(fileDir, linkUrl);
        if (!fs.existsSync(absolutePath)) {
            brokenLinks.push({
                line: node.position?.start.line,
                link: node.url,
                resolvedPath: absolutePath
            });
        }
    });
    return brokenLinks;
}

async function main() {
    console.log(`Auditing Markdown links in '${ROOT_DIR_TO_SCAN}' from project root: ${process.cwd()}`);
    const mdFiles = getMarkdownFiles(ROOT_DIR_TO_SCAN);
    let totalBrokenLinks = 0;

    for (const file of mdFiles) {
        if (verbose) {
            console.log(`- Scanning: ${file}`);
        }
        const brokenLinks = await auditMarkdownLinks(file);
        if (brokenLinks.length > 0) {
            console.log(`\n[✖] Found ${brokenLinks.length} broken link(s) in ${file}:`);
            brokenLinks.forEach(item => {
                console.log(`  - Line ${item.line}: [link](${item.link})`);
                if (verbose) {
                     console.log(`    (Resolved to non-existent path: ${item.resolvedPath})`);
                }
            });
            totalBrokenLinks += brokenLinks.length;
        }
    }

    console.log('\n---');
    if (totalBrokenLinks === 0) {
        console.log('Success: No broken relative links found.');
    } else {
        console.log(`Audit Complete: Found a total of ${totalBrokenLinks} broken link(s).`);
        process.exit(1);
    }
}

main().catch(console.error);
