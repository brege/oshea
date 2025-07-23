#!/usr/bin/env node
// paths/dep-tree.js

require('module-alias/register');
const fs = require('fs');
const path = require('path');
const { DependencyTreeTracer } = require('./lib/dependency-tracer');
const { findFilesArray } = require('../scripts/shared/file-helpers');

/**
 * Exports the context package to a specified directory.
 * @param {object} contextPackage - The package containing the file list.
 * @param {string} exportPath - The destination directory.
 * @param {string} projectRoot - The root of the project.
 */
function exportContextPackage(contextPackage, exportPath, projectRoot) {
    console.log(`\nExporting context package to: ${exportPath}`);
    if (fs.existsSync(exportPath)) {
        console.log(`Warning: Directory already exists. Overwriting files.`);
    } else {
        fs.mkdirSync(exportPath, { recursive: true });
    }

    contextPackage.files.forEach(file => {
        const sourcePath = path.join(projectRoot, file);
        const destPath = path.join(exportPath, file);

        try {
            // This check is important to avoid trying to copy a directory itself
            if (!fs.statSync(sourcePath).isDirectory()) {
                const dirName = path.dirname(destPath);
                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }
                fs.copyFileSync(sourcePath, destPath);
            }
        } catch (err) {
             console.error(`Failed to copy ${file}: ${err.message}`);
        }
    });
    console.log(`Successfully exported ${contextPackage.files.length} files.`);
}

function parseArgs(args) {
    const options = {
        showImports: args.includes('--imports') || args.includes('--all'),
        showTree: args.includes('--tree') || args.includes('--all'),
        showStats: args.includes('--stats') || args.includes('--all'),
        showFiles: args.includes('--files') || args.includes('--all'),
        verbose: args.includes('--verbose'),
        exportPath: null
    };

    const targetFiles = [];
    const includes = [];
    let nextIsInclude = false;
    let nextIsExport = false;

    for (const arg of args) {
        if (arg.startsWith('--')) {
            nextIsInclude = (arg === '--include' || arg === '-P');
            nextIsExport = (arg === '--export');
            continue;
        }

        if (nextIsExport) {
            options.exportPath = arg;
            nextIsExport = false;
        } else if (nextIsInclude) {
            includes.push(arg);
            nextIsInclude = false;
        } else {
            targetFiles.push(arg);
        }
    }

    if (!Object.values(options).some(v => v === true) && !options.exportPath) {
        options.showTree = true;
        options.showFiles = true;
    }

    return { options, targetFiles, includes };
}

function main() {
    if (process.argv.length <= 2) {
        console.error('Usage: node paths/dep-tree.js <file ...> [--export <dir>] [--include <path ...> | -P <path ...>] [options]');
        process.exit(1);
    }

    const { options, targetFiles, includes } = parseArgs(process.argv.slice(2));
    const projectRoot = process.cwd();

    try {
        const tracer = new DependencyTreeTracer();
        const contextPackage = tracer.run(targetFiles, options);

        // Add included files to the final package
        if (includes.length > 0) {
            const includedFiles = findFilesArray(includes);
            const relativeIncludedFiles = includedFiles.map(f => path.relative(projectRoot, f).replace(/\\/g, '/'));
            const combinedFiles = [...new Set([...contextPackage.files, ...relativeIncludedFiles])].sort();
            contextPackage.files = combinedFiles;
            contextPackage.stats.totalFiles = combinedFiles.length;
        }

        if (options.exportPath) {
            exportContextPackage(contextPackage, options.exportPath, projectRoot);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
