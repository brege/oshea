// scripts/devel/require-path-corrector.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

// --- Configuration ---
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'test/fixtures/**',
  'docs-devel/**',
];
const TARGET_EXTENSIONS = ['.js'];

// --- CLI arguments ---
const args = process.argv.slice(2);
const directoriesToScan = args.length > 0 ? args : ['src', 'test'];

// --- Utility Functions ---
function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
  return EXCLUDE_PATTERNS.some(pattern => relPath.startsWith(pattern));
}

function findJsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isExcluded(fullPath)) continue;

    if (entry.isDirectory()) {
      results = results.concat(findJsFiles(fullPath));
    } else if (TARGET_EXTENSIONS.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// --- Main Logic ---
async function analyzeFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const results = [];

  try {
    // MODIFICATION: Added { locations: true } to the parse options.
    const ast = parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

    simple(ast, {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          (node.arguments[0].value.startsWith('./') || node.arguments[0].value.startsWith('../'))
        ) {
          results.push({
            filePath: path.relative(process.cwd(), filePath).split(path.sep).join('/'),
            line: node.loc.start.line,
            path: node.arguments[0].value,
          });
        }
      },
    });
  } catch (e) {
    console.error(`Error parsing ${filePath}: ${e.message}`);
  }

  return results;
}

async function main() {
  console.log(`Scanning for relative require() paths in: ${directoriesToScan.join(', ')}`);
  let allRequires = [];

  for (const dir of directoriesToScan) {
    const files = findJsFiles(path.resolve(process.cwd(), dir));
    for (const file of files) {
      const requires = await analyzeFile(file);
      allRequires = allRequires.concat(requires);
    }
  }

  if (allRequires.length > 0) {
    console.log(`\nFound ${allRequires.length} relative require paths:`);
    const groupedByFile = allRequires.reduce((acc, { filePath, line, path }) => {
      if (!acc[filePath]) {
        acc[filePath] = [];
      }
      acc[filePath].push(`  - Line ${line}: require('${path}')`);
      return acc;
    }, {});

    for (const [file, lines] of Object.entries(groupedByFile)) {
      console.log(`\nFile: ${file}`);
      lines.forEach(line => console.log(line));
    }
  } else {
    console.log('No relative require paths found.');
  }
}

main().catch(console.error);
