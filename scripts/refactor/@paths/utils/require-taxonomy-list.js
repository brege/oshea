// scripts/refactor/@paths/utils/require-taxonomy-list.js
const fs = require('fs');
const { findFiles } = require('../../../shared/file-helpers');
const { classifyRequireLine } = require('../probe/require-classifier');

// Parse CLI args
const showPackageType = process.argv.includes('--show-package-type');
const roots = process.argv.filter(arg => !arg.startsWith('--')).length
  ? process.argv.filter(arg => !arg.startsWith('--'))
  : ['src'];

// Helper: Further classify pathlike requires
function subClassifyPathlike(line) {
  const code = line.replace(/\/\/.*$/, '').trim();

  // Dynamic require: require(someVar)
  if (/require\(\s*[^'"]/.test(code)) return 'dynamic';

  // Chained require: require('...').foo
  if (/require\(['"][^'"]+['"]\)\.\w+/.test(code)) return 'chained';

  // Destructured require: const { foo } = require('...');
  if (/const\s+\{[^}]+\}\s*=\s*require\(['"][^'"]+['"]\)/.test(code)) return 'destructured';

  // Default require: const foo = require('...');
  if (/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\)/.test(code)) return 'default';

  // Other (unmatched)
  return 'other';
}

const taxonomy = {
  default: [],
  destructured: [],
  chained: [],
  dynamic: [],
  other: [],
  package: [],
};

for (const root of roots) {
  for (const file of findFiles(root, {
    filter: fname => fname.endsWith('.js') || fname.endsWith('.mjs'),
  })) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const result = classifyRequireLine(line);
      if (!result) return;

      if (result.type === 'pathlike') {
        const subType = subClassifyPathlike(line);
        taxonomy[subType].push({
          file,
          line: idx + 1,
          code: line.trim(),
          requiredPath: result.requiredPath,
        });
      } else if (result.type === 'package') {
        taxonomy.package.push({
          file,
          line: idx + 1,
          code: line.trim(),
          requiredPath: result.requiredPath,
        });
      }
    });
  }
}

// Print results by taxonomy
for (const kind of ['default', 'destructured', 'chained', 'dynamic', 'other']) {
  if (taxonomy[kind].length === 0) continue;
  console.log(`\n=== type: ${kind} require ===`);
  for (const { file, line, code } of taxonomy[kind]) {
    console.log(`${file}:${line}\t${code}`);
  }
}

if (showPackageType && taxonomy.package.length) {
  console.log('\n=== type: package require ===');
  for (const { file, line, code, requiredPath } of taxonomy.package) {
    console.log(`${file}:${line}\t"${requiredPath}"\t${code}`);
  }
}
