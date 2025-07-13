#!/usr/bin/env node
// scripts/linting/docs/postman.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const process = require('process');
const { remark } = require('remark');
const { visitParents } = require('unist-util-visit-parents');
const chalk = require('chalk');

const {
  loadPostmanRules,
  getMarkdownFiles,
  isReferenceExcluded,
  isAllowedExtension,
  isSkipLink,
  resolveReference,
  findCandidates
} = require('./postman-helpers.js');

function buildLinksEnabledMap(lines) {
  let enabled = true;
  const map = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<!-- lint-disable-links')) enabled = false;
    if (line.includes('<!-- lint-enable-links')) enabled = true;
    map[i] = enabled;
  }
  return map;
}

const args = process.argv.slice(2);
const userGlobs = args.filter(a => !a.startsWith('--'));
const root = userGlobs[0] || 'docs';
const fix = args.includes('--fix');
const quiet = args.includes('--quiet');
const verbose = args.includes('--verbose');

function isLineAlreadyLinked(oldLine, rel) {
  const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
  const matches = [...oldLine.matchAll(linkRegex)];
  return matches.some(m => {
    const linkTarget = m[1].replace(/\\/g, '/');
    const relTarget = rel.replace(/\\/g, '/');
    return linkTarget === relTarget || linkTarget.endsWith('/' + path.basename(relTarget));
  });
}

async function probeMarkdownFile(mdFile, rules) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const lines = content.split('\n');
  const linksEnabled = buildLinksEnabledMap(lines);

  const tree = await remark().parse(content);

  const results = [];
  visitParents(tree, (node, ancestors) => {
    const inTable = ancestors.some(a =>
      a.type === 'table' || a.type === 'tableRow' || a.type === 'tableCell'
    );
    const inCodeBlock = ancestors.some(a => a.type === 'code');
    if (inTable || inCodeBlock) return;

    const lineNum = node.position?.start.line - 1;
    if (lineNum >= 0 && !linksEnabled[lineNum]) return;

    if (node.type === 'link') {
      const url = node.url.split('#')[0];
      if (isReferenceExcluded(url, rules)) return;
      if (isAllowedExtension(url, rules)) {
        if (isSkipLink(url, rules)) return;
        const resolved = resolveReference(mdFile, url, rules.allowed_extensions);
        results.push({
          file: mdFile,
          line: node.position?.start.line,
          type: 'link',
          target: url,
          resolved: Boolean(resolved),
          context: lines[node.position?.start.line - 1] || '',
        });
      }
    }

    if (node.type === 'inlineCode') {
      const isInLink = ancestors.some(a => a.type === 'link');
      if (isInLink) return;
      const val = node.value;
      if (val.includes(' ')) return;
      if (isReferenceExcluded(val, rules)) return;
      if (isAllowedExtension(val, rules)) {
        if (isSkipLink(val, rules)) return;
        const resolved = resolveReference(mdFile, val, rules.allowed_extensions);
        results.push({
          file: mdFile,
          line: node.position?.start.line,
          type: 'inlineCode',
          target: val,
          resolved: Boolean(resolved),
          context: lines[node.position?.start.line - 1] || '',
        });
      }
    }
  });
  return results;
}

function printLintHeader(file, line) {
  process.stdout.write(
    chalk.gray('[') +
    chalk.yellow('postman') +
    chalk.gray('] ') +
    chalk.cyan(file) +
    chalk.gray(':') +
    chalk.green(line)
  );
}

function printProblem({ file, line, target, context }, status, candidates = [], replacement = null) {
  printLintHeader(file, line);
  process.stdout.write('  ');
  if (status === 'orphan') {
    console.log(chalk.red.bold('✖ Orphan: ') + chalk.red(target));
    printContext(context, target);
  } else if (status === 'degenerate') {
    console.log(chalk.red.bold('✖ Degeneracy: ') + chalk.red(target));
    printContext(context, target);
    for (const cand of candidates) {
      const rel = path.relative(path.dirname(file), cand).replace(/\\/g, '/');
      console.log(chalk.gray('    - ') + chalk.yellow(rel));
    }
    console.log(chalk.yellow('    Suggestion: Choose the correct one manually.'));
  } else if (status === 'replace') {
    console.log(chalk.yellow('→ Replace: ') + chalk.yellow(target));
    printContext(context, target);
    console.log(chalk.green('    Suggestion: ') + replacement);
    console.log(chalk.green('    ✔ One candidate found.'));
  }
}

function printContext(context, target) {
  const idx = context.indexOf(target);
  let snippet = context;
  if (idx >= 0) {
    const start = Math.max(0, idx - 8);
    const end = Math.min(context.length, idx + target.length + 8);
    snippet = context.slice(start, idx) + target + context.slice(idx + target.length, end);
  }
  console.log(chalk.dim('    ...' + snippet + '...'));
}

async function main() {
  const rules = loadPostmanRules();
  if (verbose) {
    console.log(chalk.blue(`[postman] Loaded config: ${JSON.stringify(rules, null, 2)}`));
    console.log(chalk.blue(`[postman] Scanning root: ${root}`));
  }

  const excludeDirs = ['assets', 'docs/archive', 'node_modules', '.git'];
  const mdFiles = getMarkdownFiles(root, rules, userGlobs, excludeDirs);

  if (verbose) {
    console.log(chalk.blue(`[postman] Found ${mdFiles.length} Markdown files to scan.`));
  }

  let allResults = [];
  for (const mdFile of mdFiles) {
    const results = await probeMarkdownFile(mdFile, rules);
    allResults.push(...results);
  }

  let problems = 0, fixes = 0;

  for (const r of allResults) {
    if (r.resolved) continue;

    const candidates = findCandidates(r.target, rules.allowed_extensions, ['.', 'src', 'plugins', 'scripts', 'test']);

    if (candidates.length === 1) {
      const rel = path.relative(path.dirname(r.file), candidates[0]).replace(/\\/g, '/');
      const lines = fs.readFileSync(r.file, 'utf8').split('\n');
      const oldLine = lines[r.line - 1];

      if (isLineAlreadyLinked(oldLine, rel)) continue;
      const linksEnabled = buildLinksEnabledMap(lines);
      if (r.line - 1 >= 0 && !linksEnabled[r.line - 1]) continue;

      let replacement = null;
      if (r.type === 'inlineCode') {
        replacement = oldLine.replace(
          new RegExp('`' + r.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`'),
          '[`' + r.target + '`](' + rel + ')'
        );
      } else if (r.type === 'link') {
        replacement = oldLine.replace(/\(([^)]+)\)/, `(${rel})`);
      }

      if (fix && replacement && replacement !== oldLine) {
        lines[r.line - 1] = replacement;
        fs.writeFileSync(r.file, lines.join('\n'), 'utf8');
        fixes++;
        if (!quiet) printProblem(r, 'replace', candidates, replacement);
      } else {
        problems++;
        if (!quiet) printProblem(r, 'replace', candidates, replacement);
      }
    } else if (candidates.length > 1) {
      problems++;
      if (!quiet) printProblem(r, 'degenerate', candidates);
    } else {
      problems++;
      if (!quiet) printProblem(r, 'orphan');
    }
  }

  if (!quiet) {
    if (problems && !fix) {
      console.log(
        chalk.red.bold('\n✖ ') +
        chalk.yellow.bold(` ${problems} problem(s) found (unresolved references)`)
      );
      console.log(
        chalk.gray('  Run with ') +
        chalk.cyan('--fix') +
        chalk.gray(' to auto-fix unique matches.')
      );
    } else if (fix && fixes) {
      console.log(
        chalk.green.bold('\n✔ ') +
        chalk.green.bold(` ${fixes} reference(s) fixed.`)
      );
    } else if (!problems) {
      console.log(
        chalk.green.bold('\n✔ No unresolved references found.')
      );
    }
  }

  process.exit(problems && !fix ? 1 : 0);
}

main();

