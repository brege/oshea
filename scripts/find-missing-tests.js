// scripts/find-missing-tests.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// --- Configuration ---
const projectRoot = path.resolve(__dirname, '../');
const testDir = path.join(projectRoot, 'test');
const checklistPaths = [
    path.join(testDir, 'docs/test-scenario-checklist-Level_1.md'),
    path.join(testDir, 'docs/test-scenario-checklist-Level_2.md')
];
const auditLogPath = path.join(testDir, 'docs/audit-findings-and-limitations.md');

const moduleMap = {
    '1.1': { name: 'ConfigResolver', path: 'config-resolver' },
    '1.2': { name: 'PluginRegistryBuilder', path: 'plugin-registry-builder' },
    '1.3': { name: 'plugin_determiner', path: 'plugin_determiner' },
    '1.4': { name: 'main_config_loader', path: 'main-config-loader' },
    '1.5': { name: 'PluginManager', path: 'plugin-manager' },
    '1.6': { name: 'plugin_config_loader', path: 'plugin-config-loader' },
    '1.7': { name: 'math_integration', path: 'math_integration' },
    '1.8': { name: 'cm-utils', path: 'collections-manager' },
    '2.1': { name: 'collections-manager', path: 'collections-manager' },
    '2.2': { name: 'default_handler', path: 'default-handler' },
    '2.3': { name: 'pdf_generator', path: 'pdf-generator' },
    '2.4': { name: 'plugin_validator', path: 'plugin-validator' },
};

// --- Helper Functions ---

/**
 * Parses the audit log into a map where the key is the test ID.
 * @returns {Map<string, string>} A map of test IDs to their audit log entries.
 */
function parseAuditLog() {
    const auditMap = new Map();
    if (!fs.existsSync(auditLogPath)) return auditMap;

    const content = fs.readFileSync(auditLogPath, 'utf8');
    // Split the log into sections based on '##' or '###' headings
    const sections = content.split(/\n(?=##?# )/);

    sections.forEach(section => {
        const idMatch = section.match(/(\d+\.\d+\.\d+)/); // Find the first test-like ID
        if (idMatch) {
            const testId = idMatch[1];
            // Clean up the section content for display
            const findingText = section.replace(/##?#.*?\n/, '').trim();
            auditMap.set(testId, findingText);
        }
    });
    return auditMap;
}

// --- Main Execution ---

const auditFindings = parseAuditLog();
const allTestFiles = glob.sync(`${testDir}/**/*.js`);
const pendingScenarios = [];
const checklistRegex = /^\*\s+\[([ ?S])\]\s+(\d+\.\d+\.\d+)\s+(.*)/;

checklistPaths.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach((line, index) => {
        const match = checklistRegex.exec(line);
        if (match) {
            pendingScenarios.push({
                id: match[2],
                description: line.trim(),
                lineNumber: index + 1,
                checklistFile: path.basename(filePath)
            });
        }
    });
});

const missingScenarios = pendingScenarios.filter(s => !allTestFiles.some(f => f.includes(`.test.${s.id}.js`)));
const skippedTestFiles = allTestFiles.filter(f => fs.readFileSync(f, 'utf8').match(/it\.skip|describe\.skip/));

// --- Reporting ---

console.log('--- Audit of Pending Test Scenarios ---');
if (missingScenarios.length > 0) {
    console.log(`\n[!] Found ${missingScenarios.length} pending scenarios MISSING implementation files.\n`);
    missingScenarios.forEach(s => {
        const key = s.id.substring(0, 3);
        const moduleInfo = moduleMap[key];
        let expectedPath = 'Unknown';
        if (moduleInfo) {
            expectedPath = `test/${moduleInfo.path}/${moduleInfo.name.replace(/_/g, '-')}.test.${s.id}.js`;
        }

        console.log(`[SCENARIO] ${s.id}`);
        console.log(`  - Path:          ${expectedPath}`);
        console.log(`  - Checklist:     ${s.checklistFile} (Line ${s.lineNumber})`);
        console.log(`  - Description:   ${s.description}`);
        
        const finding = auditFindings.get(s.id);
        if (finding) {
            console.log('  - Audit Finding: This scenario has a note in the audit log.');
        }
        console.log(''); // Newline for readability
    });
} else {
    console.log('\n[✔] All pending/skipped test scenarios appear to have a corresponding test file.');
}
console.log('-------------------------------------------');


console.log('\n--- Audit of Implemented but Skipped Tests ---');
if (skippedTestFiles.length > 0) {
    console.log(`\n[!] Found ${skippedTestFiles.length} files containing 'it.skip' or 'describe.skip':\n`);
    skippedTestFiles.forEach(filePath => {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`[SKIPPED] ${relativePath}`);
        
        // Try to find a matching test ID in the filename
        const idMatch = filePath.match(/\.test\.(\d+\.\d+\.\d+)\.js/);
        if (idMatch) {
            const testId = idMatch[1];
            const finding = auditFindings.get(testId);
            if (finding) {
                console.log('  - Audit Finding: This test is skipped due to a known limitation:');
                // Indent the finding for readability
                const indentedFinding = finding.split('\n').map(line => `    ${line}`).join('\n');
                console.log(`\n${indentedFinding}\n`);
            }
        }
    });
} else {
    console.log('\n[✔] No implemented test files appear to contain skipped tests.');
}
console.log('----------------------------------------------');
