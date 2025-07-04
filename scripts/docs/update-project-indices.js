// scripts/docs/update-project-indices.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(process.cwd(), '.index-config.yaml');
const START_MARKER = '<!-- uncategorized-start -->';
const END_MARKER = '<!-- uncategorized-end -->';

function getExistingLinks(content, baseDir) {
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
            const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
            links.add(rel);
        } catch (e) {
            // Ignore errors from invalid links
        }
    }
    return links;
}

function updateIndexFile(groupName, groupConfig) {
    const { indexFile, scanRoot, fileExtensions, excludePatterns } = groupConfig;

    const INDEX_FILE_PATH = path.resolve(process.cwd(), indexFile);
    if (!fs.existsSync(INDEX_FILE_PATH)) {
        console.error(`ERROR: Index file for group '${groupName}' not found at ${INDEX_FILE_PATH}`);
        return;
    }

    console.log(`\n--- Processing Group: ${groupName} ---`);
    console.log(`Index File: ${indexFile}`);

    const INDEX_DIR = path.dirname(INDEX_FILE_PATH);
    const content = fs.readFileSync(INDEX_FILE_PATH, 'utf8');
    const lines = content.split('\n');

    const startIdx = lines.findIndex(line => line.trim() === START_MARKER);
    const endIdx = lines.findIndex(line => line.trim() === END_MARKER);

    const scanRoots = Array.isArray(scanRoot) ? scanRoot : [scanRoot];
    let allFiles = [];
    for (const root of scanRoots) {
        // Correctly handle multiple extensions by creating a proper glob pattern.
        const extPattern = fileExtensions.length > 1 ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}` : fileExtensions[0].replace(/^\./, '');
        const globPattern = `${root}/**/*.${extPattern}`;
        
        console.log(`  Scanning with glob pattern: ${globPattern}`);

        const found = glob.sync(globPattern, {
            ignore: [...(excludePatterns || []), '**/node_modules/**', '**/.git/**'],
            nodir: true,
        });
        allFiles = allFiles.concat(found);
    }
    console.log(`  Found ${allFiles.length} total files in scan root(s).`);
    // Optional: Uncomment to see all files found
    // console.log('  Files Found:', allFiles);

    const existingLinks = getExistingLinks(content, INDEX_DIR);
    console.log(`  Found ${existingLinks.size} existing links in ${indexFile}`);
    // Optional: Uncomment to see all links parsed
    // console.log('  Existing Links:', existingLinks);

    const untrackedFiles = allFiles.filter(file => {
        const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
        return !existingLinks.has(relPath);
    });

    if (untrackedFiles.length === 0) {
        console.log(`✔ Skipped ${indexFile} (no new uncategorized files).`);
        return;
    }

    console.log(`  Found ${untrackedFiles.length} untracked files to add.`);
    // Optional: Uncomment to see untracked files
    // console.log('  Untracked Files:', untrackedFiles);

    const newUncatLines = untrackedFiles.map(file => {
        const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
        return `- [${path.basename(file)}](${relPath})`;
    });

    let finalContent;
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const before = lines.slice(0, startIdx + 1).join('\n');
        const after = lines.slice(endIdx).join('\n');
        finalContent = `${before}\n${newUncatLines.join('\n')}\n${after}`;
    } else {
        console.warn(`WARN: Markers not found in ${indexFile}. Appending list to the end.`);
        finalContent = `${content}\n\n${START_MARKER}\n${newUncatLines.join('\n')}\n${END_MARKER}\n`;
    }

    fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');
    console.log(`✔ Updated ${indexFile} with ${newUncatLines.length} untracked file(s).`);
}

function main() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`ERROR: Configuration file not found at ${CONFIG_PATH}`);
        process.exit(1);
    }

    const configs = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const args = process.argv.slice(2);
    const groupArg = args.find(arg => arg.startsWith('--group='));
    const specificGroup = groupArg ? groupArg.split('=')[1] : null;

    if (specificGroup) {
        const groupConfig = configs[specificGroup];
        if (groupConfig) {
            updateIndexFile(specificGroup, groupConfig);
        } else {
            console.error(`ERROR: Group '${specificGroup}' not found in configuration.`);
        }
    } else {
        for (const groupName in configs) {
            if (Object.hasOwnProperty.call(configs, groupName)) {
                updateIndexFile(groupName, configs[groupName]);
            }
        }
    }
}

if (require.main === module) {
    main();
}
