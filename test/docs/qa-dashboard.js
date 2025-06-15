const fs = require('fs');
const path = require('path');

// --- Helper functions for all three sources ---

// 1. Build testId -> testTarget, checklistStatus, checklistFile
function getChecklistOpenTests() {
  const DOCS_DIR = __dirname;
  const checklistFiles = fs.readdirSync(DOCS_DIR)
    .filter(f => /^checklist-with-headers-Level_\d+\.md$/.test(f))
    .map(f => path.join(DOCS_DIR, f));

  const openTests = {};
  for (const file of checklistFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const checklistMatch = lines[i].match(/^\*\s*\[\s*\]\s+(\d+\.\d+\.\d+)/);
      if (checklistMatch) {
        const testId = checklistMatch[1];
        let isOpen = false;
        let testTarget = '';
        for (let j = i + 1; j < lines.length; j++) {
          const statusLine = lines[j].trim();
          if (statusLine.startsWith('- **status:**') && statusLine.match(/OPEN/i)) {
            isOpen = true;
          }
          const targetMatch = lines[j].match(/- \*\*test_target:\*\*\s*(.*)/);
          if (targetMatch) {
            testTarget = targetMatch[1].trim();
          }
          if (lines[j].startsWith('* [')) break;
        }
        if (isOpen) {
          openTests[testId] = { testTarget, checklistStatus: 'OPEN' };
        }
      }
    }
  }
  return openTests;
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
        if (skips > 0) {
          testIdToFile[testId] = { testFilePath: relPath, skips };
        }
      }
    });
  });
  return testIdToFile;
}

// 3. Build testId -> auditLogLine
function getAuditLogMap() {
  const AUDIT_LOG = path.join(__dirname, 'audit-log.md');
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
        const statusMatch = lines[j].match(/- \*\*status:\*\* (.+)$/);
        if (statusMatch) { status = statusMatch[1].trim().toUpperCase(); break; }
        if (lines[j].startsWith('## Entry:')) break;
      }
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

// --- Build unified set of "in trouble" test codes ---
const openTests = getChecklistOpenTests();
const testIdToFile = getTestIdToFileAndSkipMap();
const auditMap = getAuditLogMap();

const allTestIds = new Set([
  ...Object.keys(openTests),
  ...Object.keys(testIdToFile),
  ...Object.keys(auditMap)
]);

// --- Output Markdown table ---
console.log('| Test Code | Test Target         | Checklist | # it.skip() | Audit Log      | Test File Path                                         |');
console.log('|-----------|---------------------|-----------|-------------|---------------|--------------------------------------------------------|');

for (const testId of Array.from(allTestIds).sort((a, b) => {
  // Sort numerically if possible
  const aParts = a.split('.').map(Number), bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
})) {
  const t = openTests[testId] || {};
  const f = testIdToFile[testId] || {};
  const a = auditMap[testId] || '';
  const checklistStatus = t.checklistStatus || '';
  const testTarget = t.testTarget || '';
  const skips = f.skips > 0 ? f.skips + ' it.skip()' : '';
  const testFilePath = f.testFilePath || '';
  // Only show if at least one of these is non-empty
  if (checklistStatus || skips || a) {
    console.log(
      `| ${testId.padEnd(9)}| ${testTarget.padEnd(20)}| ${checklistStatus.padEnd(9)}| ${skips.padEnd(11)}| ${a.padEnd(13)}| ${testFilePath.padEnd(54)}|`
    );
  }
}

