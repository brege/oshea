// test/scripts/qa-dashboard.js
const fs = require('fs');
const path = require('path');

// --- Helper functions for all three sources ---

// 1. Build testId -> testTarget, checklistStatus for ALL checklist entries
function getChecklistStatuses() {
  const DOCS_DIR = path.join(__dirname, '../docs');
  const checklistFiles = fs.readdirSync(DOCS_DIR)
    .filter(f => /^checklist-level-\d+\.md$/.test(f))
    .map(f => path.join(DOCS_DIR, f));

  const allChecklistStatuses = {};
  for (const file of checklistFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Capture the test ID and its status marker [ ], [x], [S], [?]
      const checklistMatch = lines[i].match(/^\*\s*\[(\s*|x|S|\?)\s*\]\s+(\d+\.\d+\.\d+)/);
      if (checklistMatch) {
        const marker = checklistMatch[1].trim();
        const testId = checklistMatch[2];

        let checklistStatus = '';
        if (marker === 'x') {
            checklistStatus = 'CLOSED';
        } else if (marker === 'S') {
            checklistStatus = 'SKIPPED';
        } else if (marker === '?') {
            checklistStatus = 'PENDING';
        } else if (marker === '') {
            checklistStatus = 'OPEN';
        }

        let testTarget = '';
        // Look ahead for test_target (status is already parsed from marker)
        for (let j = i + 1; j < lines.length; j++) {
          const targetMatch = lines[j].match(/- \*\*test_target:\*\*\s*(.*)/);
          if (targetMatch) {
            testTarget = targetMatch[1].trim();
          }
          if (lines[j].startsWith('* [')) break; // Stop if another checklist item starts
        }
        allChecklistStatuses[testId] = { testTarget, checklistStatus };
      }
    }
  }
  return allChecklistStatuses;
}

// 2. Build testId -> {skips, testFilePath}
function findAllJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findAllJsFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}
function getTestIdToFileAndSkipMap() {
  const dirs = [
    path.join(__dirname, '../integration'),
    path.join(__dirname, '../e2e'),
  ];
  const testIdToFile = {};
  dirs.forEach(dir => {
    findAllJsFiles(dir).forEach(file => {
      const match = file.match(/\.test\.((?:\d+\.)*\d+)\.js$/);
      if (match) {
        const testId = match[1];
        const idx = file.lastIndexOf('/test/');
        const relPath = idx !== -1 ? file.slice(idx + 1) : file;
        const content = fs.readFileSync(file, 'utf8');
        const skips = (content.match(/it\.skip\s*\(/g) || []).length;
        if (skips > 0) { // Only add if skips exist
          testIdToFile[testId] = { testFilePath: relPath, skips };
        }
      }
    });
  });
  return testIdToFile;
}

// 3. Build testId -> auditLogLine
function getAuditLogMap() {
  const AUDIT_LOG = path.join(__dirname, '../docs/audit-log.md');
  const lines = fs.readFileSync(AUDIT_LOG, 'utf8').split('\n');
  const auditMap = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const entryMatch = line.match(/^## Entry: (.+)$/);
    if (entryMatch) {
      const entryLineNum = i + 1;
      let testIdRaw = entryMatch[1].trim();
      let status = null;
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const tidMatch = lines[j].match(/- \*\*test_id:\*\* (.+)$/);
        if (tidMatch) testIdRaw = tidMatch[1].trim();
        const statusMatch = lines[j].match(/- \*\*status:\*\*\s*(.+)$/);
        if (statusMatch) { status = statusMatch[1].trim().toUpperCase(); break; }
        if (lines[j].startsWith('## Entry:')) break;
      }
      // Only add to auditMap if status is NOT 'CLOSED'
      if (status !== 'CLOSED') {
        const testIds = testIdRaw.split(',').map(s => s.trim()).filter(Boolean);
        for (const testId of testIds) {
          if (!/^\d+(\.\d+)*$/.test(testId)) continue; // Only numeric codes
          auditMap[testId] = `audit-log:${entryLineNum}`;
        }
      }
    }
  }
  return auditMap;
}

// --- Main execution logic ---

function generateDashboardContent() {
    const checklistStatuses = getChecklistStatuses();
    const testIdToFile = getTestIdToFileAndSkipMap();
    const auditMap = getAuditLogMap();

    const allTestIds = new Set([
      ...Object.keys(checklistStatuses),
      ...Object.keys(testIdToFile),
      ...Object.keys(auditMap)
    ]);

    const sortedIds = Array.from(allTestIds).sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (aParts[i] || 0) - (bParts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    const outputLines = [];
    outputLines.push('| Test Code | Test Target         | Checklist | # it.skip() | Audit Log      | Test File Path                                         |');
    outputLines.push('|-----------|---------------------|-----------|-------------|---------------|--------------------------------------------------------|');

    for (const testId of sortedIds) {
      const checklistEntry = checklistStatuses[testId] || {};
      const f = testIdToFile[testId] || {};
      const a = auditMap[testId] || '';

      const checklistStatus = checklistEntry.checklistStatus || '';
      const testTarget = checklistEntry.testTarget || ''; // Use testTarget from checklist

      // Only include if checklist status is NOT 'CLOSED'
      // OR if it's an audit entry not found in the checklist
      // OR if it has skips not found in the checklist
      if (checklistStatus !== 'CLOSED' && (checklistStatus || f.skips || a)) {
        const skips = f.skips > 0 ? f.skips + ' it.skip()' : '';
        const testFilePath = f.testFilePath || '';
        outputLines.push(
          `| ${testId.padEnd(9)}| ${testTarget.padEnd(20)}| ${checklistStatus.padEnd(9)}| ${skips.padEnd(11)}| ${a.padEnd(13)}| ${testFilePath.padEnd(54)}|`
        );
      } else if (!checklistStatus && (f.skips || a)) { // For tests not in checklist but in skips or audit
         const skips = f.skips > 0 ? f.skips + ' it.skip()' : '';
         const testFilePath = f.testFilePath || '';
         outputLines.push(
          `| ${testId.padEnd(9)}| ${testTarget.padEnd(20)}| ${checklistStatus.padEnd(9)}| ${skips.padEnd(11)}| ${a.padEnd(13)}| ${testFilePath.padEnd(54)}|`
        );
      }
    }
    return outputLines;
}

function updateReadme(dashboardLines) {
    const readmePath = path.join(__dirname, '..', 'README.md');
    const startMarker = '<!--qa-dashboard-start-->';
    const endMarker = '<!--qa-dashboard-end-->';

    let readmeContent;
    try {
        readmeContent = fs.readFileSync(readmePath, 'utf8');
    } catch (error) {
        console.error(`ERROR: Could not read README.md at ${readmePath}.`, error);
        return;
    }

    const newContent = [
        startMarker,
        ...dashboardLines,
        endMarker
    ].join('\n');

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const regex = new RegExp(
        `${escapeRegex(startMarker)}[\\s\\S]*${escapeRegex(endMarker)}`,
        'g'
    );

    if (!regex.test(readmeContent)) {
        console.error(`ERROR: Could not find dashboard markers in ${readmePath}. Please ensure these markers exist:\n${startMarker}\n...\n${endMarker}`);
        return;
    }

    // Perform the replacement
    readmeContent = readmeContent.replace(regex, newContent);

    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log(`Successfully updated dashboard in ${readmePath}`);
}


// --- Check command line arguments to determine action ---
if (process.argv.includes('--update-readme')) {
    const dashboardLines = generateDashboardContent();
    updateReadme(dashboardLines);
} else {
    // Default behavior: print to stdout
    const dashboardLines = generateDashboardContent();
    console.log(dashboardLines.join('\n'));
}
