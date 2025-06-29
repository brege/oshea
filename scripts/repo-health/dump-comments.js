const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] || './test';

// Helpful header with Bash commands
const header = `
===== Helpful Bash Commands to Remove Common Patterns =====

# To remove lines with "FIX:" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*FIX:/d' {} +

# To remove lines with "DIAGNOSTIC PROBE" or "CORRECTED:" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*\\(DIAGNOSTIC PROBE\\|CORRECTED:\\)/d' {} +

# To remove lines with "Destructure" in test/ directory
find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*Destructure/d' {} +

===== Dump of Comments =====
`;

// Helpful footer
const footer = `
===== End of Comments =====

# Add more patterns as needed:
# find test/ -type f -name "*.js" -exec sed -i '/^[[:space:]]*\\/\\/.*PATTERN/d' {} +
`;

// Print header
console.log(header);

// (Your existing processFile and walkDir functions here...)
function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let output = [];

    // Skip the first two lines
    const filteredLines = lines.slice(2);

    filteredLines.forEach((line) => {
        const trimmed = line.trim();
        const commentStart = line.indexOf('//');

        if (commentStart === -1) return; // No comment

        if (trimmed.startsWith('//')) {
            // Type Two: Only comment
            output.push(line.substring(line.indexOf('//')));
        } else {
            // Type One: Code and comment
            const code = line.substring(0, commentStart).trim();
            const comment = line.substring(commentStart);
            output.push(`# ${code}`);
            output.push(comment);
        }
    });

    if (output.length > 0) {
        console.log(`=== ${filePath} ===`);
        console.log(output.join('\n'));
        console.log(); // Extra newline for separation
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.isFile() && fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

walkDir(TARGET_DIR);

// Print footer
console.log(footer);

