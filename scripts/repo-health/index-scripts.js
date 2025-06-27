const fs = require('fs');
const path = require('path');

const INDEX_FILE_PATH = path.join('scripts', 'index.md');
const START_MARKER = '<!-- scripts-start -->';
const END_MARKER = '<!-- scripts-end -->';
const SCRIPT_EXTENSIONS = ['.js', '.sh', '.py', '.mjs']; // Add more if needed

// Exclude any paths containing these directories
const EXCLUDES = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'vendor',
    '.cache',
];

// Checks if a path should be excluded
function isExcluded(filePath) {
    return EXCLUDES.some(ex => filePath.split(path.sep).includes(ex));
}

// Recursively find all files under any 'scripts' directory (at any depth)
function findAllScriptFiles(startDir) {
    let results = [];
    const entries = fs.readdirSync(startDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(startDir, entry.name);
        if (isExcluded(fullPath)) continue;
        if (entry.isDirectory()) {
            if (entry.name === 'scripts') {
                results = results.concat(findScriptFilesRecursive(fullPath));
            } else {
                results = results.concat(findAllScriptFiles(fullPath));
            }
        }
    }
    return results;
}

// Recursively find script files under a given scripts/ dir
function findScriptFilesRecursive(scriptsDir) {
    let results = [];
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(scriptsDir, entry.name);
        if (isExcluded(fullPath)) continue;
        if (entry.isDirectory()) {
            results = results.concat(findScriptFilesRecursive(fullPath));
        } else if (SCRIPT_EXTENSIONS.includes(path.extname(entry.name))) {
            results.push(path.relative(process.cwd(), fullPath));
        }
    }
    return results;
}

// Reads the current index.md and returns a Set of normalized relative paths
function getExistingLinks() {
    if (!fs.existsSync(INDEX_FILE_PATH)) return new Set();
    const content = fs.readFileSync(INDEX_FILE_PATH, 'utf8');
    const linkRegex = /\[.*?\]\((.*?)\)/g;
    const links = new Set();
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        // Normalize relative to repo root
        const rawLink = match[1];
        // Resolve relative to scripts/index.md location
        const absoluteLink = path.resolve(path.dirname(INDEX_FILE_PATH), rawLink);
        const relToRoot = path.relative(process.cwd(), absoluteLink).replace(/\\/g, '/');
        links.add(relToRoot);
    }
    return links;
}

function updateIndexFile() {
    if (!fs.existsSync(INDEX_FILE_PATH)) {
        console.error(`ERROR: Index file not found at ${INDEX_FILE_PATH}`);
        return;
    }

    const allScripts = findAllScriptFiles(process.cwd());
    const existingLinks = getExistingLinks();

    // Only include scripts not already linked
    const untrackedScripts = allScripts.filter(script => {
        // Normalize script path for comparison
        const normalizedScript = script.replace(/\\/g, '/');
        return ![...existingLinks].some(link => link === normalizedScript);
    });

    // Update index.md
    const indexContentLines = fs.readFileSync(INDEX_FILE_PATH, 'utf8').split('\n');
    const startIdx = indexContentLines.findIndex(line => line.trim() === START_MARKER);
    const endIdx = indexContentLines.findIndex(line => line.trim() === END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
        console.error(`ERROR: Could not find markers in ${INDEX_FILE_PATH}. Please add:\n${START_MARKER}\n${END_MARKER}`);
        return;
    }

    const newContentLines = untrackedScripts.map(script =>
        `- [${path.basename(script)}](${path.relative('scripts', script).replace(/\\/g, '/')})`
    );

    const pre = indexContentLines.slice(0, startIdx + 1);
    const post = indexContentLines.slice(endIdx);
    const finalContent = [...pre, '', ...newContentLines, '', ...post].join('\n');
    fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');

    if (untrackedScripts.length === 0) {
        console.log(' ✔ All discovered scripts are already tracked in index.md.');
    } else {
        console.log(` ✔ Successfully updated ${INDEX_FILE_PATH} with ${untrackedScripts.length} untracked script(s).`);
    }
}

// CLI
if (require.main === module) {
    updateIndexFile();
}

