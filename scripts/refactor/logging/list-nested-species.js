#!/usr/bin/env node
// scripts/refactor/logging/list-nested-species.js

const fs = require('fs');
const path = require('path');
require('module-alias/register');
const { srcRoot } = require('@paths');

const reportPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(srcRoot, '..', 'logging-probe-report.json');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

for (const fileReport of report) {
  for (const hit of fileReport.hits || []) {
    if (
      hit.type === 'console' &&
      hit.code.includes('${')
    ) {
      // Print file, line, and code, one per line
      console.log(`${fileReport.file}:${hit.line}: ${hit.code}`);
    }
  }
}

