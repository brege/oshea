// scripts/docs/index-scripts.js
const fs = require('fs');
const path = require('path');

const SCRIPT_EXTENSIONS = ['.js', '.sh', '.py', '.mjs'];
const EXCLUDES = ['node_modules', '.git', 'dist', 'build', 'vendor', '.cache'];
const START_MARKER = '<!-- scripts-start -->';
const END_MARKER = '<!-- scripts-end -->';

// Checks if a path should be excluded
function isExcluded(filePath) {
    return EXCLUDES.some(ex => filePath.split(path.sep).includes(ex));
}

// Recursively find all index.md files under dir (at any depth)
function findAllIndexFiles(dir) {
    let indices = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (isExcluded(fullPath)) continue;
            if (entry.isDirectory()) {
                indices = indices.concat(findAllIndexFiles(fullPath));
            } else if (entry.isFile() && entry.name === 'index.md') {
                indices.push(fullPath);
            }
        }
    } catch (e) {
        // Ignore errors from non-existent directories, etc.
    }
    return indices;
}

// For a given index.md, find delegated subdirs (those with their own index.md, immediate children only)
function findDelegatedDirs(indexDir, allIndexFiles) {
    const delegated = new Set();
    for (const idx of allIndexFiles) {
        const dir = path.dirname(idx);
        if (dir !== indexDir && path.dirname(dir) === indexDir) {
            delegated.add(dir);
        }
    }
    return delegated;
}

// Recursively find script files under a given dir, excluding delegated subdirs
function findAllScripts(scanDir, baseDir, delegatedDirs) {
    let scripts = [];
    try {
        const entries = fs.readdirSync(scanDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(scanDir, entry.name);
            if (isExcluded(fullPath)) continue;
            if (entry.isDirectory()) {
                if (delegatedDirs.has(fullPath)) continue;
                scripts = scripts.concat(findAllScripts(fullPath, baseDir, delegatedDirs));
            } else if (SCRIPT_EXTENSIONS.includes(path.extname(entry.name))) {
                scripts.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return scripts;
}

// Reads index.md and returns a Set of normalized relative paths, ignoring the auto-generated block
function getExistingLinks(content, baseDir, delegatedDirs) {
    const linkRegex = /\[.*?\]\((.*?)\)/g;
    const links = new Set();
    let match;

    const startIdx = content.indexOf(START_MARKER);
    const endIdx = content.indexOf(END_MARKER);
    const hasUncatBlock = startIdx !== -1 && endIdx !== -1 && endIdx > startIdx;

    while ((match = linkRegex.exec(content)) !== null) {
        if (hasUncatBlock && match.index > startIdx && match.index < endIdx) {
            continue; // Ignore links inside the uncategorized block
        }

        const rawLink = match[1];
        if (!rawLink || rawLink.startsWith('http')) continue;

        try {
            const abs = path.resolve(baseDir, rawLink);
            if ([...delegatedDirs].some(dir => abs.startsWith(dir + path.sep))) continue;
            const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
            links.add(rel);
        } catch (e) {
            // Ignore errors from invalid links
        }
    }
    return links;
}

// Updates a single index.md file
function updateIndexFile(INDEX_FILE_PATH, allIndexFiles) {
    if (!fs.existsSync(INDEX_FILE_PATH)) {
        console.error(`ERROR: Index file not found at ${INDEX_FILE_PATH}`);
        return;
    }

    const INDEX_DIR = path.dirname(path.resolve(INDEX_FILE_PATH));
    const content = fs.readFileSync(INDEX_FILE_PATH, 'utf8');
    const lines = content.split('\n');

    const startIdx = lines.findIndex(line => line.trim() === START_MARKER);
    const endIdx = lines.findIndex(line => line.trim() === END_MARKER);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        console.error(`ERROR: Could not find markers in ${INDEX_FILE_PATH}. Please add:\n${START_MARKER}\n${END_MARKER}`);
        return;
    }

    const delegatedDirs = findDelegatedDirs(INDEX_DIR, allIndexFiles);
    const allScripts = findAllScripts(INDEX_DIR, INDEX_DIR, delegatedDirs);
    const existingLinks = getExistingLinks(content, INDEX_DIR, delegatedDirs);
    const untrackedScripts = allScripts.filter(script => !existingLinks.has(script));

    const newUncatLines = untrackedScripts.map(script => `- [${path.basename(script)}](${script})`);
    
    const existingBlockContent = lines.slice(startIdx + 1, endIdx).filter(l => l.trim() !== '').join('\n');
    const newBlockContent = newUncatLines.join('\n');

    if (existingBlockContent === newBlockContent) {
        console.log(`✔ Skipped ${INDEX_FILE_PATH} (no change in uncategorized scripts).`);
        return;
    }

    const before = lines.slice(0, startIdx + 1);
    const after = lines.slice(endIdx);
    const finalLines = [...before, ...newUncatLines, ...after];

    fs.writeFileSync(INDEX_FILE_PATH, finalLines.join('\n'), 'utf8');
    console.log(`✔ Updated ${INDEX_FILE_PATH} with ${newUncatLines.length} untracked script(s).`);
}

// CLI: update all indices under scripts/, deepest first
if (require.main === module) {
    let allIndexFiles = findAllIndexFiles('scripts').map(f => path.resolve(f));
    allIndexFiles.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
    for (const idx of allIndexFiles) {
        updateIndexFile(idx, allIndexFiles);
    }
}
