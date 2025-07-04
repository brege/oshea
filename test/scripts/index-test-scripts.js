// test/scripts/index-test-scripts.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const INDEX_FILE_PATH = path.join('test', 'index.md');
const START_MARKER = '<!-- test-scripts-start -->';
const END_MARKER = '<!-- test-scripts-end -->';

const QA_DASHBOARD_SCRIPT_PATH = path.join(__dirname, 'qa-dashboard.js');
const QA_DASHBOARD_START_MARKER = '<!-- qa-dashboard-start -->';
const QA_DASHBOARD_END_MARKER = '<!-- qa-dashboard-end -->';

const SCRIPT_EXTENSIONS = ['.js', '.sh', '.py', '.mjs'];
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

// Recursively find all script files under test/scripts/
function findTestScriptFiles(startDir) {
    let results = [];
    if (!fs.existsSync(startDir)) return results;
    const entries = fs.readdirSync(startDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(startDir, entry.name);
        if (isExcluded(fullPath)) continue;
        if (entry.isDirectory()) {
            results = results.concat(findTestScriptFiles(fullPath));
        } else if (SCRIPT_EXTENSIONS.includes(path.extname(entry.name))) {
            // Path relative to test/index.md
            results.push(path.relative(path.dirname(INDEX_FILE_PATH), fullPath));
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
        // Normalize relative to test/index.md location
        const rawLink = match[1];
        const absoluteLink = path.resolve(path.dirname(INDEX_FILE_PATH), rawLink);
        const relToIndex = path.relative(path.dirname(INDEX_FILE_PATH), absoluteLink).replace(/\\/g, '/');
        links.add(relToIndex);
    }
    return links;
}

// Runs the qa-dashboard.js script and returns its output as an array of lines
function getQaDashboardLines() {
    if (!fs.existsSync(QA_DASHBOARD_SCRIPT_PATH)) {
        return ['(qa-dashboard.js not found)'];
    }
    const result = spawnSync('node', [QA_DASHBOARD_SCRIPT_PATH], { encoding: 'utf8' });
    if (result.error) {
        return [`(Error running qa-dashboard.js: ${result.error.message})`];
    }
    // Split by newlines and trim
    return result.stdout.split(/\r?\n/).filter(line => line.trim().length > 0);
}

function updateIndexFile() {
    if (!fs.existsSync(INDEX_FILE_PATH)) {
        console.error(`ERROR: Index file not found at ${INDEX_FILE_PATH}`);
        return;
    }

    const allScripts = findTestScriptFiles(path.join('test', 'scripts'));
    const existingLinks = getExistingLinks();

    // Only include scripts not already linked
    const untrackedScripts = allScripts.filter(script => {
        const normalizedScript = script.replace(/\\/g, '/');
        return ![...existingLinks].some(link => link === normalizedScript);
    });

    // Read and split index.md
    const indexContentLines = fs.readFileSync(INDEX_FILE_PATH, 'utf8').split('\n');
    const startIdx = indexContentLines.findIndex(line => line.trim() === START_MARKER);
    const endIdx = indexContentLines.findIndex(line => line.trim() === END_MARKER);

    const qaStartIdx = indexContentLines.findIndex(line => line.trim() === QA_DASHBOARD_START_MARKER);
    const qaEndIdx = indexContentLines.findIndex(line => line.trim() === QA_DASHBOARD_END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
        console.error(`ERROR: Could not find script markers in ${INDEX_FILE_PATH}. Please add:
${START_MARKER}
${END_MARKER}`);
        return;
    }
    if (qaStartIdx === -1 || qaEndIdx === -1) {
        console.error(`ERROR: Could not find QA dashboard markers in ${INDEX_FILE_PATH}. Please add:
${QA_DASHBOARD_START_MARKER}
${QA_DASHBOARD_END_MARKER}`);
        return;
    }

    const newScriptLines = untrackedScripts.map(script =>
        `- [${path.basename(script)}](${script.replace(/\\/g, '/')})`
    );

    // Replace scripts section
    const pre = indexContentLines.slice(0, startIdx + 1);
    const post = indexContentLines.slice(endIdx);
    const newIndexLines = [...pre, '', ...newScriptLines, '', ...post];

    // Replace QA dashboard section
    const qaDashboardLines = getQaDashboardLines();
    const qaPre = newIndexLines.slice(0, qaStartIdx + 1);
    const qaPost = newIndexLines.slice(qaEndIdx);
    const finalContent = [...qaPre, ...qaDashboardLines, ...qaPost].join('\n');

    fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');

    if (untrackedScripts.length === 0) {
        console.log(' ✔ All discovered test scripts are already tracked in index.md.');
    } else {
        console.log(` ✔ Successfully updated ${INDEX_FILE_PATH} with ${untrackedScripts.length} untracked test script(s).`);
    }
    console.log(' ✔ QA dashboard section updated.');
}

// CLI
if (require.main === module) {
    updateIndexFile();
}

