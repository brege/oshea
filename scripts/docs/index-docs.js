// scripts/docs/index-docs.js
const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// --- Configuration ---
const DOCS_ROOT = 'docs';
const INDEX_FILE_PATH = path.join(DOCS_ROOT, 'index.md');
const EXCLUSION_PATTERNS = [
    'test/*-develop.md',
    'dev/**',
    'docs-devel/**',
    'examples/**',
    'node_modules/**',
    'plugins/**',         // exclude individual plugin *.md
    '!plugins/README.md', // ..but NOT the main plugins/README.md
    'test/fixtures/**',
];

const START_MARKER = '<!-- etc-start -->';
const END_MARKER = '<!-- etc-end -->';

// --- Core Logic ---

function findMarkdownFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (let file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (['.git', 'node_modules', 'docs-devel'].includes(file)) {
                continue;
            }
            results = results.concat(findMarkdownFiles(fullPath));
        } else if (file.endsWith('.md')) {
            const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
            let isExcludedByPattern = EXCLUSION_PATTERNS.some(p => p.startsWith('!') ? false : minimatch(relPath, p));
            let isWhitelisted = EXCLUSION_PATTERNS.some(p => p.startsWith('!') && minimatch(relPath, p.substring(1)));
            if (!isExcludedByPattern || isWhitelisted) {
                results.push(relPath);
            }
        }
    }
    return results;
}

/**
 * Updates the index.md file with a list of untracked documents.
 */
function updateIndexFile() {
    if (!fs.existsSync(INDEX_FILE_PATH)) {
        console.error(`ERROR: Index file not found at ${INDEX_FILE_PATH}`);
        return;
    }

    const allDocs = findMarkdownFiles('.');
    const indexContentLines = fs.readFileSync(INDEX_FILE_PATH, 'utf8').split('\n');

    const existingLinks = new Set();
    const linkRegex = /\[.*?\]\((.*?)\)/g;
    indexContentLines.forEach(line => {
        let match;
        while ((match = linkRegex.exec(line)) !== null) {
            try {
                const resolvedPath = path.resolve(DOCS_ROOT, match[1]);
                const projectRelativePath = path.relative(process.cwd(), resolvedPath).replace(/\\/g, '/');
                existingLinks.add(projectRelativePath);
            } catch (e) { /* Ignore external links */ }
        }
    });

    const untrackedDocs = allDocs.filter(doc => !existingLinks.has(doc) && doc !== INDEX_FILE_PATH);

    const startIdx = indexContentLines.findIndex(line => line.trim() === START_MARKER);
    const endIdx = indexContentLines.findIndex(line => line.trim() === END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
        console.error(`ERROR: Could not find markers in ${INDEX_FILE_PATH}. Please add:\n${START_MARKER}\n${END_MARKER}`);
        return;
    }

    if (untrackedDocs.length === 0) {
        // If no untracked docs, just clean up between the markers
        const pre = indexContentLines.slice(0, startIdx + 1);
        const post = indexContentLines.slice(endIdx);
        const finalContent = [...pre, '', ...post].join('\n');
        fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');
        console.log(' ✔ All discovered documents are already tracked in index.md.');
        return;
    }

    console.log(`Found ${untrackedDocs.length} untracked document(s) to add.`);

    const newContentLines = untrackedDocs.map(doc => `- [${doc}](${path.relative(DOCS_ROOT, doc).replace(/\\/g, '/')})`);

    // Rebuild the file content as an array of lines
    const pre = indexContentLines.slice(0, startIdx + 1);
    const post = indexContentLines.slice(endIdx);
    const finalContent = [...pre, '', ...newContentLines, '', ...post].join('\n');

    fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');
    console.log(` ✔ Successfully updated ${INDEX_FILE_PATH} with ${untrackedDocs.length} untracked document(s).`);
}


// --- CLI Setup ---

yargs(hideBin(process.argv))
    .scriptName("index-docs")
    .command('$0', 'List all discovered docs that are not excluded.', () => {}, (argv) => {
        const files = findMarkdownFiles('.');
        console.log(files.join('\n'));
    })
    .command('update', 'Update index.md with untracked documents.', () => {}, (argv) => {
        updateIndexFile();
    })
    .demandCommand(1, 'Please specify a command: `update` or run without a command to list files.')
    .help()
    .argv;
