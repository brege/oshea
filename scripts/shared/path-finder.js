#!/usr/bin/env node
// scripts/shared/path-finder.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const {
  fileHelpersPath,
  loggerPath
} = require('@paths');
const { findFilesArray } = require(fileHelpersPath);
const logger = require(loggerPath);

// Returns all registry/export variables that resolve to the given absolute path.
function findVariableByPath(targetPath) {
  const absoluteTargetPath = path.resolve(targetPath);

  function* walkRegistry(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yield* walkRegistry(value);
      } else if (typeof value === 'string') {
        try {
          if (path.resolve(value) === absoluteTargetPath) {
            yield key;
          }
        } catch (e) {}
      }
    }
  }

  return [...new Set(walkRegistry(require('@paths')))];
}

function getFileExports(targetPath) {
  const exportsSet = new Set();
  if (!fs.existsSync(targetPath)) return [];

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    const ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });

    walk.simple(ast, {
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'Identifier' &&
          node.left.object.name === 'module' &&
          node.left.property.name === 'exports'
        ) {
          if (node.right.type === 'ObjectExpression') {
            node.right.properties.forEach(prop => {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                exportsSet.add(prop.key.name);
              } else if (prop.type === 'SpreadElement' && prop.argument.type === 'Identifier') {
                exportsSet.add(`...${prop.argument.name}`);
              }
            });
          }
        }
      }
    });
  } catch (e) {}
  return Array.from(exportsSet).sort();
}

function findVariablesForTargets(targets) {
  const fileList = findFilesArray(targets, { filter: fn => fn.endsWith('.js') || fn.endsWith('.mjs') });
  const results = [];

  for (const f of fileList) {
    const variables = findVariableByPath(f);
    if (variables.length > 0) {
      results.push({ file: f, variable: variables[0] });
    }
  }

  return results;
}

if (require.main === module) {
  let rawTargets = process.argv.slice(2);
  if (!rawTargets.length) {
    logger.error('Usage: node scripts/shared/path-finder.js <file|dir|glob> [...]', { format: 'inline' });
    process.exit(1);
  }
  // If the last argument is --exports, print exports for each file
  const showExports = rawTargets.includes('--exports');
  if (showExports) rawTargets = rawTargets.filter(arg => arg !== '--exports');

  const fileList = findFilesArray(rawTargets, { filter: fn => fn.endsWith('.js') || fn.endsWith('.mjs') });

  // Collect all variables and map to their files
  const variableSet = new Set();
  const fileVariables = [];
  for (const file of fileList) {
    const variables = findVariableByPath(file);
    if (variables.length > 0) {
      variableSet.add(variables[0]);
      fileVariables.push({ file, variable: variables[0] });
    }
  }

  if (variableSet.size > 0) {
    let output = '';

    output += 'require(\'module-alias/register\');\n';

    const varsSorted = Array.from(variableSet).sort();
    const coloredVars = varsSorted.join(',\n  ');
    output += `const {\n  ${coloredVars}\n} = require('@paths');\n`;

    if (showExports) {
      for (const { file, variable } of fileVariables) {
        const exportsArr = getFileExports(file);
        if (exportsArr.length > 0) {
          const exportsString = exportsArr.join(',\n  ');
          output += `const {\n  ${exportsString}\n} = require(${variable}); // File: ${file}\n`;
        }
      }
    } else {
      for (const { file } of fileVariables) {
        output += `// File: ${file}\n`;
      }
    }

    logger.info(output, { format: 'paths' });
  } else {
    for (const file of fileList) {
      logger.detail(`No variable found for path: ${path.resolve(file)}\n`, { format: 'inline' });
    }
    process.exit(1);
  }
}

module.exports = {
  findVariableByPath,
  getFileExports,
  findVariablesForTargets,
};

