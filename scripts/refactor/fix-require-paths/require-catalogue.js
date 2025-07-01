// scripts/refactor/fix-require-paths/require-catalogue.js

// --- Configuration ---
const path = require('path');
const fs = require('fs');

const REPO_ROOT = process.cwd();
const CONFIG_FILE = path.join(__dirname, 'config.ini');
console.log(`Using config file: ${CONFIG_FILE}`);
const OUTPUT_FILE = path.join(REPO_ROOT, 'require-catalogue.json');


// --- Helper Functions ---
function parseIni(filePath) {
    const config = {};
    if (!fs.existsSync(filePath)) throw new Error(`Config file not found: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    let currentSection = null;
    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) return;
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.substring(1, line.length - 1);
            config[currentSection] = {};
        } else if (currentSection && line.includes('=')) {
            const [key, value] = line.split('=', 2);
            config[currentSection][key.trim()] = value.trim();
        }
    });
    return config;
}

function getAllJsFiles(dir, fileList = [], excludeDirs = []) {
    const fullDir = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(fullDir)) return fileList;
    if (excludeDirs.some(ex => dir.startsWith(ex))) return fileList;

    for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const relativeEntryPath = path.join(dir, entry.name);
        if (excludeDirs.some(ex => relativeEntryPath.startsWith(ex))) continue;

        const fullEntryPath = path.join(REPO_ROOT, relativeEntryPath);
        if (entry.isDirectory()) {
            getAllJsFiles(relativeEntryPath, fileList, excludeDirs);
        } else if (entry.isFile() && fullEntryPath.endsWith('.js')) {
            fileList.push(fullEntryPath);
        }
    }
    return fileList;
}


// --- Main ---
const config = parseIni(CONFIG_FILE);
const SRC_DIRS = config.paths.dirs ? config.paths.dirs.split(',') : [];
const ENTRY_FILES = config.paths.files ? config.paths.files.split(',') : [];
const EXCLUDE_DIRS = config.paths.exclude ? config.paths.exclude.split(',') : [];

// Step 1: Build basename index
const basenameIndex = new Map();
let allJsFiles = [];
for (const dir of SRC_DIRS) {
    getAllJsFiles(dir, allJsFiles, EXCLUDE_DIRS);
}

for (const entryFile of ENTRY_FILES) {
    const fullPath = path.join(REPO_ROOT, entryFile);
    if (fs.existsSync(fullPath)) {
        allJsFiles.push(fullPath);
    }
}

for (const file of allJsFiles) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');

    if (relPath.endsWith('/index.js')) {
        const dirName = path.basename(path.dirname(relPath));
        if (!basenameIndex.has(dirName)) basenameIndex.set(dirName, []);
        basenameIndex.get(dirName).push(relPath);
    }

    const baseNoExt = path.basename(file, '.js');
    if (!basenameIndex.has(baseNoExt)) basenameIndex.set(baseNoExt, []);
    basenameIndex.get(baseNoExt).push(relPath);
}

// Step 2: Extract require/import paths and check against index
const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
const catalogue = [];

for (const file of allJsFiles) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    let requires = [];

    let match;
    while ((match = requireRegex.exec(content)) !== null) requires.push(match[1]);
    while ((match = importRegex.exec(content)) !== null) requires.push(match[1]);

    let matchedBasenames = [];
    for (const req of requires) {
        if (!req.startsWith('.')) continue;

        const baseName = path.basename(req, '.js');
        let matches = [];
        if (basenameIndex.has(baseName)) {
            matches = matches.concat(basenameIndex.get(baseName));
        }
        matches = [...new Set(matches)];

        if (matches.length > 0) {
            matchedBasenames.push({
                require: req.replace(/\\/g, '/'),
                basename: baseName,
                matches
            });
        }
    }

    if (matchedBasenames.length > 0) {
        catalogue.push({
            file: relPath,
            requires: matchedBasenames
        });
    }
}

// Step 3: Output the catalogue as JSON
const output = {
  index: Object.fromEntries(basenameIndex),
  catalogue
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(`Catalogue saved to ${path.relative(REPO_ROOT, OUTPUT_FILE)}`);
