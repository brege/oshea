// scripts/refactor/join-path-probe.js
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// --- Configuration ---
const PROJECT_ROOT = process.cwd();
const DEFAULT_TARGET = 'src';  // Default directory to scan

// --- Helper Functions ---
function getJsFiles(target, allFiles = []) {
    if (!fs.existsSync(target)) return allFiles;
    const stat = fs.statSync(target);
    if (stat.isFile() && target.endsWith('.js')) {
        allFiles.push(target);
    } else if (stat.isDirectory()) {
        const entries = fs.readdirSync(target, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            const fullPath = path.join(target, entry.name);
            getJsFiles(fullPath, allFiles);
        }
    }
    return allFiles;
}

function staticallyResolvePath(node, fileDir, method) {
    if (!node.arguments) return null;

    const segments = [];
    for (const arg of node.arguments) {
        if (arg.type === 'StringLiteral') {
            segments.push(arg.value);
        } else if (arg.type === 'Identifier' && arg.name === '__dirname') {
            segments.push(fileDir);
        } else {
            return null; // Dynamic values
        }
    }

    return path[method](...segments);
}

// --- Main Analysis ---
function analyzeFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    let ast;
    try {
        ast = parser.parse(code, { sourceType: 'unambiguous' });
    } catch (e) {
        return [];
    }

    const findings = [];
    const fileDir = path.dirname(filePath);

    traverse(ast, {
        CallExpression(pathNode) {
            const callee = pathNode.node.callee;
            if (callee.type !== 'MemberExpression' ||
                callee.object.name !== 'path' ||
                !['join', 'resolve'].includes(callee.property.name)) {
                return;
            }

            const line = pathNode.node.loc.start.line;
            const codeLine = code.split('\n')[line - 1].trim();
            const resolvedPath = staticallyResolvePath(pathNode.node, fileDir, callee.property.name);

            findings.push({
                file: path.relative(PROJECT_ROOT, filePath),
                line,
                code: codeLine,
                resolvedPath: resolvedPath ? path.relative(PROJECT_ROOT, resolvedPath) : 'DYNAMIC',
                exists: resolvedPath ? fs.existsSync(resolvedPath) : null
            });
        }
    });
    return findings;
}

// --- CLI Execution ---
function main() {
    // Get target directory from CLI argument
    const targetDir = process.argv[2] || DEFAULT_TARGET;
    const absTargetDir = path.isAbsolute(targetDir)
        ? targetDir
        : path.join(PROJECT_ROOT, targetDir);

    if (!fs.existsSync(absTargetDir)) {
        console.error(`Error: Directory not found - ${absTargetDir}`);
        process.exit(1);
    }

    console.log(`Scanning: ${path.relative(PROJECT_ROOT, absTargetDir)}`);

    const files = getJsFiles(absTargetDir);
    const allFindings = files.flatMap(analyzeFile);

    // Simple output formatting
    for (const f of allFindings) {
        const status = f.exists === null ? 'DYNAMIC' : f.exists ? 'EXISTS' : 'MISSING';
        console.log(`[${status}] ${f.file}:${f.line}`);
        console.log(`  Path: ${f.resolvedPath}`);
        console.log(`  Code: ${f.code}`);
    }

    console.log(`\nDone. Found ${allFindings.length} path expressions.`);
}

main();

