// scripts/repo-health/fix-require-paths/replace-requires.js
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const REPO_ROOT = process.cwd();
const WRITE_MODE = process.argv.includes('--write');
const CATALOGUE_FILE = path.join(REPO_ROOT, 'require-catalogue.json');

// --- Load Data ---
if (!fs.existsSync(CATALOGUE_FILE)) {
    console.error(`ERROR: Catalogue file not found at ${CATALOGUE_FILE}`);
    console.error('Please run the require-catalogue.js script first.');
    process.exit(1);
}
const catalogueData = JSON.parse(fs.readFileSync(CATALOGUE_FILE, 'utf8'));
const { index, catalogue } = catalogueData;

// --- Helper Functions ---
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRelativeRequire(fromFile, toFile) {
    const fromDir = path.dirname(path.join(REPO_ROOT, fromFile));
    const toPath = path.join(REPO_ROOT, toFile);
    let rel = path.relative(fromDir, toPath);
    if (!rel.startsWith('.')) rel = './' + rel;
    if (rel.endsWith('.js')) rel = rel.slice(0, -3);
    rel = rel.replace(/\/index$/, '');
    return rel.replace(/\\/g, '/');
}

// --- Main Logic ---
const degenerateBases = new Set(
    Object.entries(index)
        .filter(([, files]) => files.length > 1)
        .map(([basename]) => basename)
);

const suggestions = [];
const degenerateReport = [];

for (const fileEntry of catalogue) {
    const fromFile = fileEntry.file;
    for (const req of fileEntry.requires) {
        if (degenerateBases.has(req.basename)) {
            degenerateReport.push({
                file: fromFile,
                require: req.require,
                basename: req.basename,
                candidates: index[req.basename]
            });
            continue;
        }

        if (req.matches.length === 1) {
            const toFile = req.matches[0];
            const suggested = getRelativeRequire(fromFile, toFile);

            if (suggested !== req.require) {
                suggestions.push({
                    file: fromFile,
                    old: req.require,
                    new: suggested
                });
            }
        }
    }
}

// --- Output or Write Changes ---
if (WRITE_MODE) {
    const byFile = {};
    for (const s of suggestions) {
        if (!byFile[s.file]) byFile[s.file] = [];
        byFile[s.file].push(s);
    }
    for (const [filePath, changes] of Object.entries(byFile)) {
        const fullPath = path.join(REPO_ROOT, filePath);
        let content = fs.readFileSync(fullPath, 'utf8');
        changes.sort((a, b) => b.old.length - a.old.length);
        for (const s of changes) {
            const regex = new RegExp(`(['"\`])${escapeRegex(s.old)}\\1`, 'g');
            content = content.replace(regex, `$1${s.new}$1`);
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Rewrote: ${filePath}`);
    }
    if (suggestions.length > 0) {
        console.log(`\nAll ${suggestions.length} replacements written.\n`);
    } else {
        console.log('\nNo unambiguous replacements needed.\n');
    }
} else {
    console.log('--- Require/Import Path Replacement Suggestions ---');
    for (const s of suggestions) {
        console.log(`File: ${s.file}`);
        console.log(`  Replace: require/import '${s.old}'`);
        console.log(`      With: '${s.new}'`);
        console.log('');
    }
}

// --- Degenerate Basename Report ---
if (degenerateReport.length > 0) {
    console.log('--- Degenerate Basename Requires/Imports (Not Replaced) ---');
    const grouped = degenerateReport.reduce((acc, entry) => {
        if (!acc[entry.file]) acc[entry.file] = [];
        acc[entry.file].push(entry);
        return acc;
    }, {});
    for (const [file, entries] of Object.entries(grouped)) {
        console.log(`\nFile: ${file}`);
        for (const entry of entries) {
            console.log(`  require/import '${entry.require}' refers to degenerate basename '${entry.basename}'`);
            console.log('    Candidates:');
            for (const c of entry.candidates) {
                console.log(`      - ${c}`);
            }
        }
    }
    console.log('\n--- End Degenerate Basename Report ---');
}
