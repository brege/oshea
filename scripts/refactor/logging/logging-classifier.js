// scripts/refactor/logging/logging-classifier.js

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { findFiles } = require('../../shared/file-helpers');

require('module-alias/register');
const { srcRoot } = require('@paths');
const targetDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : srcRoot;

// Helper: describe a single argument
function describeArg(arg) {
  // Is it a chalk call?
  if (
    arg.type === 'CallExpression' &&
    arg.callee.type === 'MemberExpression'
  ) {
    // Detect chained styles: chalk.green.bold(...)
    let chain = [];
    let curr = arg.callee;
    while (curr.type === 'MemberExpression') {
      if (curr.property && curr.property.name) chain.unshift(curr.property.name);
      curr = curr.object;
      if (curr.type === 'Identifier' && curr.name === 'chalk') {
        chain.unshift('chalk');
        break;
      }
    }
    if (chain[0] === 'chalk') return `chalk.${chain.slice(1).join('.')}`;
  }
  // Is it a string literal?
  if (arg.type === 'StringLiteral' || arg.type === 'Literal') return 'string';
  // Is it a template literal?
  if (arg.type === 'TemplateLiteral') return 'template';
  // Otherwise, generic
  return arg.type;
}

// Main classifier
const species = {}; // { pattern: count }
const speciesFiles = {}; // { pattern: [ {file, line, code} ] }

for (const file of findFiles(targetDir, {
  filter: name => name.endsWith('.js') || name.endsWith('.mjs')
})) {
  let code;
  try {
    code = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.warn(`Could not read file: ${file}`);
    continue;
  }
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['estree'],
    });
  } catch (e) {
    console.warn(`Failed to parse ${file}: ${e.message}`);
    continue;
  }
  const lines = code.split('\n');

  traverse(ast, {
    CallExpression(nodePath) {
      const node = nodePath.node;
      // Only consider console.* calls
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.name === 'console'
      ) {
        const logType = node.callee.property.name;
        // Describe all arguments
        const argDescriptions = node.arguments.map(describeArg);
        // Compose species string
        let pattern = `console.${logType}(`;
        if (argDescriptions.length === 0) {
          pattern += 'no args';
        } else {
          pattern += argDescriptions.join(', ');
        }
        pattern += `) [${argDescriptions.length} arg${argDescriptions.length === 1 ? '' : 's'}]`;
        // Record
        species[pattern] = (species[pattern] || 0) + 1;
        if (!speciesFiles[pattern]) speciesFiles[pattern] = [];
        const loc = node.loc ? node.loc.start.line : null;
        speciesFiles[pattern].push({
          file: path.relative(process.cwd(), file),
          line: loc,
          code: loc ? lines[loc - 1].trim() : '[line unknown]',
        });
      }
    },
  });
}

// Print summary table
console.log('--- Logging Species Table ---');
Object.entries(species)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pattern, count]) => {
    console.log(`${pattern.padEnd(50)} : ${count}`);
  });

// Optionally, print details for rare species
const threshold = 10; // show details for species with ≤ this many occurrences
console.log('\n--- Rare/Weird Species (≤', threshold, ') ---');
Object.entries(species)
  .filter(([pattern, count]) => count <= threshold)
  .forEach(([pattern, count]) => {
    console.log(`\n${pattern} : ${count}`);
    speciesFiles[pattern].forEach(({ file, line, code }) => {
      console.log(`  ${file}:${line || '?'}: ${code}`);
    });
  });

console.log('\n-----------------------------');

