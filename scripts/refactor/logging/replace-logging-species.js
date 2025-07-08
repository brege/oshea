#!/usr/bin/env node
// scripts/refactor/logging/replace-logging-species.js

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const { findFiles } = require('../../shared/file-helpers');

// Use centralized path management
require('module-alias/register');
const { srcRoot } = require('@paths');

/**
 * Replace all matching logging callsites in a file, including template literals.
 * @param {string} filePath
 * @param {object} opts
 * @param {string} [opts.species] - e.g. "console.log(chalk.red)"
 * @param {string} [opts.loggerMethod] - e.g. "logger.error"
 * @param {boolean} opts.write - actually write changes
 * @returns {number} Number of replacements made
 */
function replaceLoggingSpeciesInFile(filePath, { species, loggerMethod, write }) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'unambiguous',
    });
  } catch (e) {
    return 0;
  }

  // Parse species pattern, e.g. "console.log(chalk.red)"
  let match, consoleObj, consoleFn, chalkObj, chalkFn, loggerObj, loggerFn;
  if (species && loggerMethod) {
    match = species.match(/(\w+)\.(\w+)\((?:(chalk)\.(\w+))?\)/);
    if (!match) {
      throw new Error('Invalid species format: ' + species);
    }
    [, consoleObj, consoleFn, chalkObj, chalkFn] = match;
    [loggerObj, loggerFn] = loggerMethod.split('.');
  }

  let replaced = 0;

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;

      // ---- 1. Replace direct species matches as before ----
      if (species && loggerMethod) {
        // Match: console.log(...)
        if (
          t.isMemberExpression(node.callee) &&
          node.callee.object.name === consoleObj &&
          node.callee.property.name === consoleFn
        ) {
          // Match: console.log(chalk.red(...))
          if (
            chalkFn &&
            node.arguments.length === 1 &&
            t.isCallExpression(node.arguments[0])
          ) {
            const inner = node.arguments[0];
            if (
              t.isMemberExpression(inner.callee) &&
              inner.callee.object.name === chalkObj &&
              inner.callee.property.name === chalkFn
            ) {
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(t.identifier(loggerObj), t.identifier(loggerFn)),
                  inner.arguments
                )
              );
              replaced++;
              return;
            }
          }
          // Match: console.log('string') (no chalk)
          else if (!chalkFn && node.arguments.length === 1 && t.isStringLiteral(node.arguments[0])) {
            path.replaceWith(
              t.callExpression(
                t.memberExpression(t.identifier(loggerObj), t.identifier(loggerFn)),
                node.arguments
              )
            );
            replaced++;
            return;
          }
        }
      }

      // ---- 2. Replace ALL template literal console.* calls (with or without chalk) ----
      if (
        t.isMemberExpression(node.callee) &&
        node.callee.object.name === 'console'
      ) {
        const method = node.callee.property.name;

        // Case a: console.<method>(chalk.<color>(`...`))
        if (
          node.arguments.length === 1 &&
          t.isCallExpression(node.arguments[0]) &&
          t.isMemberExpression(node.arguments[0].callee) &&
          node.arguments[0].arguments.length === 1 &&
          t.isTemplateLiteral(node.arguments[0].arguments[0])
        ) {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.identifier('logger'),
                t.identifier(method === 'error' ? 'error' : 'info')
              ),
              [node.arguments[0].arguments[0]]
            )
          );
          replaced++;
          return;
        }

        // Case b: console.<method>(`...`)
        else if (
          node.arguments.length === 1 &&
          t.isTemplateLiteral(node.arguments[0])
        ) {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(
                t.identifier('logger'),
                t.identifier(method === 'error' ? 'error' : 'info')
              ),
              [node.arguments[0]]
            )
          );
          replaced++;
          return;
        }
      }
    }
  });

  if (replaced && write) {
    const newCode = generate(ast, {}, code).code;
    fs.writeFileSync(filePath, newCode, 'utf8');
  }
  return replaced;
}

/**
 * Replace logging species across all JS files under a directory.
 * If no species/loggerMethod provided, will only handle template literal cases.
 * @param {string} targetDir
 * @param {object} opts
 * @returns {object} { totalFiles, totalReplaced, filesChanged }
 */
function replaceLoggingSpecies(targetDir, opts) {
  let totalFiles = 0;
  let totalReplaced = 0;
  let filesChanged = [];
  for (const file of findFiles(targetDir, {
    filter: (name) => name.endsWith('.js') || name.endsWith('.mjs')
  })) {
    const replaced = replaceLoggingSpeciesInFile(file, opts);
    if (replaced) {
      filesChanged.push(file);
      totalReplaced += replaced;
    }
    totalFiles++;
  }
  return { totalFiles, totalReplaced, filesChanged };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetDir = args[0]
    ? path.resolve(process.cwd(), args[0])
    : srcRoot;
  const species = args[1];
  const loggerMethod = args[2];
  const write = args.includes('--write');

  if (!species || !loggerMethod) {
    // If not provided, just do template literal migration for all console.* calls
    console.log('No species/loggerMethod provided: will only migrate template literal console.* calls.');
  }

  console.log(`Scanning for: ${species ? `${species} → ${loggerMethod}` : 'all template literal console.* calls'} in ${targetDir}`);
  const { totalFiles, totalReplaced, filesChanged } = replaceLoggingSpecies(targetDir, { species, loggerMethod, write });

  if (write) {
    console.log(`\n[WRITE MODE]`);
    console.log(`Files changed: ${filesChanged.length}`);
    console.log(`Total replacements: ${totalReplaced}`);
    filesChanged.forEach(f => console.log('  ', f));
  } else {
    console.log(`\n[DRY RUN]`);
    console.log(`Files that would change: ${filesChanged.length}`);
    console.log(`Total replacements: ${totalReplaced}`);
    filesChanged.forEach(f => console.log('  ', f));
    console.log('\nAdd --write to perform replacements.');
  }
}

module.exports = { replaceLoggingSpecies, replaceLoggingSpeciesInFile };

