#!/usr/bin/env node
// scripts/shared/path-finder.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const paths = require('@paths');
const chalk = require('chalk');


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
        } catch (e) {
          // Ignore paths that can't be resolved (like non-path strings in the object)
        }
      }
    }
  }

  return [...new Set(walkRegistry(paths))];
}


function getFileExports(targetPath) {
  const exports = new Set();
  if (!fs.existsSync(targetPath)) return [];

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    const ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });

    walk.simple(ast, {
      AssignmentExpression(node) {
        if (node.left.type === 'MemberExpression' &&
                    node.left.object.type === 'Identifier' &&
                    node.left.object.name === 'module' &&
                    node.left.property.name === 'exports') {

          if (node.right.type === 'ObjectExpression') {
            node.right.properties.forEach(prop => {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                exports.add(prop.key.name);
              } else if (prop.type === 'SpreadElement' && prop.argument.type === 'Identifier') {
                exports.add(`...${prop.argument.name}`);
              }
            });
          }
        }
      }
    });
  } catch (e) {
    void 0; // eslint-disable-line no-empty
  }

  return Array.from(exports).sort();
}


if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/shared/find-path-variable.js <path/to/file>');
    process.exit(1);
  }

  const variables = findVariableByPath(target);

  if (variables.length > 0) {
    const variableName = variables[0];
    const exports = getFileExports(target);
    console.log(`${chalk.cyan('require')}(${chalk.magenta('\'module-alias/register\'')});`);
    console.log(chalk.cyan(`const { ${chalk.yellow(variableName)} } = require('@paths');`));

    if (exports.length > 0) {
      const exportsString = exports.map(e => chalk.yellow(e)).join(',\n  ');
      console.log(chalk.cyan(`const {\n  ${exportsString}\n} = require(${chalk.yellow(variableName)});`));
    }
  } else {
    console.error(chalk.red(`No variable found for path: ${path.resolve(target)}`));
    process.exit(1);
  }

}

module.exports = { findVariableByPath, getFileExports };
