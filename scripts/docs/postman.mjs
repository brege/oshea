#!/usr/bin/env node
// scripts/docs/postman.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { remark } from 'remark';
import { visitParents } from 'unist-util-visit-parents';
import chalk from 'chalk';
import {
  loadPostmanRules,
  getMarkdownFiles,
  isReferenceExcluded,
  isAllowedExtension,
  resolveReference,
  findCandidates
} from './postman-helpers.mjs';

// --- Region disabling helpers ---
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

// --- CLI args and config ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (path.basename(__dirname) === 'scripts') {
  process.chdir(path.resolve(__dirname, '../..'));
}

const args = process.argv.slice(2);
const userGlobs = args.filter(a => !a.startsWith('--'));
const root = userGlobs[0] || 'docs';
const fix = args.includes('--fix');
const quiet = args.includes('--quiet');

// --- Linting logic ---

function isLineAlreadyLinked(oldLine, rel) {
  // Returns true if there's a markdown link to the rel path on this line
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
    // Skip if inside a table or code block (AST-based)
    const inTable = ancestors.some(a =>
      a.type === 'table' || a.type === 'tableRow' || a.type === 'tableCell'
    );
    const inCodeBlock = ancestors.some(a => a.type === 'code');
    if (inTable || inCodeBlock) return;

    // Skip if links are disabled for this line
    const lineNum = node.position?.start.line - 1;
    if (lineNum >= 0 && !linksEnabled[lineNum]) return;

    // Markdown links
    if (node.type === 'link') {
      const url = node.url.split('#')[0];
      if (isReferenceExcluded(url, 'md', rules)) return;
      if (isAllowedExtension(url, 'md', rules)) {
        const resolved = resolveReference(mdFile, url, rules.link_types.md.allow_extensions);
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
    // Inline code references for JS
    if (node.type === 'inlineCode') {
      const val = node.value;
      if (isReferenceExcluded(val, 'js', rules)) return;
      if (isAllowedExtension(val, 'js', rules)) {
        const resolved = resolveReference(mdFile, val, rules.link_types.js.allow_extensions);
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
  const excludeDirs = ['assets', 'docs/archive', 'node_modules', '.git'];
  const mdFiles = getMarkdownFiles(root, rules, userGlobs, excludeDirs);

  let allResults = [];
  for (const mdFile of mdFiles) {
    const results = await probeMarkdownFile(mdFile, rules);
    allResults.push(...results);
  }

  let problems = 0, fixes = 0;

  // --- DRY RUN or --fix loop ---
  for (const r of allResults) {
    if (r.resolved) continue;
    let exts = ['.js', '.mjs', '.md'];
    if (r.type === 'link' && r.target.endsWith('.md')) exts = ['.md'];
    if (r.type === 'inlineCode' && (r.target.endsWith('.js') || r.target.endsWith('.mjs'))) exts = ['.js', '.mjs'];
    const candidates = findCandidates(r.target, exts, ['.', 'src', 'plugins', 'scripts', 'test']);

    if (candidates.length === 1) {
      const rel = path.relative(path.dirname(r.file), candidates[0]).replace(/\\/g, '/');
      const replacement = '[`' + r.target + '`]' + `(${rel})`;
      const lines = fs.readFileSync(r.file, 'utf8').split('\n');
      const oldLine = lines[r.line - 1];

      // Prevent double-linking: skip if already inside a Markdown link
      if (isLineAlreadyLinked(oldLine, rel)) continue;

      // Prevent replacing if links are disabled for this line (again, for safety)
      const linksEnabled = buildLinksEnabledMap(lines);
      if (r.line - 1 >= 0 && !linksEnabled[r.line - 1]) continue;

      if (fix) {
        const newLine = oldLine.replace(r.target, replacement);
        lines[r.line - 1] = newLine;
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

  // --- Summary (only print once) ---
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

  process.exit(0);
}

main();

