// scripts/linting/find-to-include-assertions.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const projectRoot = path.resolve(__dirname, '../../');
const testDir = path.join(projectRoot, 'test');
const contextLines = 3; // Number of lines before/after match to show

// Helper: Find the enclosing test/describe title for a given line
function findEnclosingTestBlock(lines, matchLine) {
    for (let i = matchLine; i >= 0; i--) {
        const testMatch = lines[i].match(/^\s*(it|test)\(['"`](.+?)['"`],/);
        const describeMatch = lines[i].match(/^\s*describe\(['"`](.+?)['"`],/);
        if (testMatch) return `it: ${testMatch[2]}`;
        if (describeMatch) return `describe: ${describeMatch[1]}`;
    }
    return null;
}

function printMatch({ file, lineNum, codeContext, enclosingBlock }) {
    console.log(`\n[FOUND] ${file}:${lineNum + 1}`);
    if (enclosingBlock) {
        console.log(`  In: ${enclosingBlock}`);
    }
    console.log('  --- Code Context ---');
    codeContext.forEach((line, i) => {
        const pointer = (i === contextLines) ? '>>' : '  ';
        console.log(`${pointer} ${line}`);
    });
    console.log('----------------------');
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('to.include')) {
            // Grab context lines
            const start = Math.max(0, i - contextLines);
            const end = Math.min(lines.length, i + contextLines + 1);
            const codeContext = lines.slice(start, end);
            const enclosingBlock = findEnclosingTestBlock(lines, i);
            printMatch({
                file: path.relative(projectRoot, filePath),
                lineNum: i,
                codeContext,
                enclosingBlock
            });
        }
    });
}

const allTestFiles = glob.sync(`${testDir}/**/*.js`);
let totalMatches = 0;

allTestFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('to.include')) {
        scanFile(file);
        totalMatches++;
    }
});

if (totalMatches === 0) {
    console.log('No `to.include` assertions found in test files.');
} else {
    console.log(`\nTotal files with \`to.include\`: ${totalMatches}`);
}

