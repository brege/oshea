#!/usr/bin/env node
// scripts/linting/docs/postman.js

require('module-alias/register');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { lintHelpersPath, lintingConfigPath, formattersPath, projectRoot } = require('@paths');

const { parseCliArgs, loadLintSection } = require(lintHelpersPath);
const { formatLintResults, adaptRawIssuesToEslintFormat } = require(formattersPath);

const {
  getMarkdownFiles,
  isReferenceExcluded,
  isAllowedExtension,
  isSkipLink,
  resolveReference,
  findCandidates
} = require('./postman-helpers.js');

const ENABLE_MARKER = '<!-- lint-enable-links -->';
const DISABLE_MARKER = '<!-- lint-disable-links -->';

function buildLinksEnabledMap(lines) {
  let enabled = true;
  return lines.map(line => {
    if (line.includes(DISABLE_MARKER)) enabled = false;
    if (line.includes(ENABLE_MARKER)) enabled = true;
    return enabled;
  });
}

function isLineAlreadyLinked(line, rel) {
  const linkRegex = /\[[^\]]*]\(([^)]+)\)/g;
  return [...line.matchAll(linkRegex)].some(m => {
    const target = m[1].replace(/\\/g, '/');
    return target === rel || target.endsWith('/' + path.basename(rel));
  });
}

async function probeMarkdownFile(mdFile, rules) {
  const [{ remark }, { visitParents }] = await Promise.all([
    import('remark'),
    import('unist-util-visit-parents')
  ]);

  const content = fs.readFileSync(mdFile, 'utf8');
  const lines = content.split('\n');
  const linkStatus = buildLinksEnabledMap(lines);
  const tree = await remark().parse(content);

  const results = [];

  visitParents(tree, (node, ancestors) => {
    const lineNum = node.position?.start.line;
    const lineContent = lines[lineNum - 1] || '';
    const skip = !linkStatus[lineNum - 1];
    const inTable = ancestors.some(a => a.type?.startsWith('table'));
    const inCode = ancestors.some(a => a.type === 'code');

    if (skip || inTable || inCode) return;

    if (node.type === 'link') {
      const url = node.url.split('#')[0];
      if (isReferenceExcluded(url, rules) || !isAllowedExtension(url, rules) || isSkipLink(url, rules)) return;

      const resolved = resolveReference(mdFile, url, rules.allowed_extensions);
      results.push({
        file: mdFile,
        line: lineNum,
        type: 'link',
        target: url,
        resolved: !!resolved,
        context: lineContent,
      });
    }

    if (node.type === 'inlineCode') {
      if (
        ancestors.some(a => a.type === 'link') ||
        node.value.includes(' ') ||
        isReferenceExcluded(node.value, rules) ||
        !isAllowedExtension(node.value, rules) ||
        isSkipLink(node.value, rules)
      ) return;

      const resolved = resolveReference(mdFile, node.value, rules.allowed_extensions);
      results.push({
        file: mdFile,
        line: lineNum,
        type: 'inlineCode',
        target: node.value,
        resolved: !!resolved,
        context: lineContent,
      });
    }
  });

  return results;
}

async function runLinter({
  targets = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
  force = false,
  config = {}
} = {}) {
  if (debug) {
    console.log('[DEBUG] Loaded config:', config);
    console.log('[DEBUG] Targets:', targets);
  }

  const rules = config;
  const allowedExt = rules.allowed_extensions || [];
  const mdFiles = getMarkdownFiles(targets[0] || 'docs', rules, targets, [
    'assets', 'docs/archive', 'node_modules', '.git'
  ]);

  if (debug) {
    console.log('[DEBUG] Found Markdown files:', mdFiles);
  }

  const issues = [];
  let fixedCount = 0;

  for (const file of mdFiles) {
    const relFile = path.relative(projectRoot, file);
    const results = await probeMarkdownFile(file, rules);

    for (const r of results) {
      if (r.resolved) continue;

      const candidates = findCandidates(r.target, allowedExt, ['.', 'src', 'plugins', 'scripts', 'test']);
      const relCandidates = candidates.map(c =>
        path.relative(path.dirname(file), c).replace(/\\/g, '/')
      );

      if (candidates.length === 1 && r.type === 'inlineCode') {
        const rel = relCandidates[0];
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        const oldLine = lines[r.line - 1] || '';
        if (isLineAlreadyLinked(oldLine, rel)) continue;

        const replacement = oldLine.replace(
          '`' + r.target + '`',
          '[`' + r.target + '`](' + rel + ')'
        );

        if (fix) {
          if (!dryRun) {
            lines[r.line - 1] = replacement;
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
          }
          fixedCount++;
        } else {
          issues.push({
            file: relFile,
            line: r.line,
            rule: 'fixable-link',
            severity: 1,
            message: `Resolvable reference: '${r.target}' → '${rel}'`,
          });
        }

        continue;
      }

      if (candidates.length > 1) {
        issues.push({
          file: relFile,
          line: r.line,
          rule: 'degenerate-link',
          severity: 2,
          message: `Degenerate match: '${r.target}' resolves to multiple files.`,
          candidates: relCandidates,
        });

        continue;
      }

      issues.push({
        file: relFile,
        line: r.line,
        rule: 'orphan-link',
        severity: 2,
        message: `Orphan reference: '${r.target}' not found.`,
      });
    }
  }

  if (!quiet) {
    const formatted = formatLintResults(adaptRawIssuesToEslintFormat(issues));
    if (formatted) {
      console.log(formatted);
    }

    if (!formatted) {
      console.log(chalk.green('✔ No unresolved references found.'));
    }

    if (debug && issues.length > 0) {
      for (const i of issues) {
        if (i.candidates && i.candidates.length > 0) {
          for (const c of i.candidates) {
            console.log(chalk.gray(`    candidate: ${c}`));
          }
        }
      }
    }

    if (fix && fixedCount > 0 && !dryRun) {
      console.log(`✔ Fixed ${fixedCount} unambiguous reference(s).`);
    } else if (fix && dryRun && fixedCount > 0) {
      console.log(`[dry-run] Would have fixed ${fixedCount} reference(s).`);
    } else if (!fix && fixedCount > 0) {
      console.log('\nRun with --fix to automatically link unambiguous references.');
    }

    if (issues.length > 0) {
      console.log(`\nFound ${issues.length} unresolved or ambiguous reference(s).`);
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
  }

  if (debug && dryRun) {
    console.log('[DEBUG] Dry-run mode enabled — no files written.');
  }

  process.exitCode = issues.length > 0 && !fix ? 1 : 0;
  return { issueCount: issues.length, fixedCount };
}

if (require.main === module) {
  (async () => {
    const { flags, targets } = parseCliArgs(process.argv.slice(2));
    const config = loadLintSection('doc-links', lintingConfigPath) || {};

    await runLinter({
      targets,
      fix: !!flags.fix,
      quiet: !!flags.quiet,
      json: !!flags.json,
      debug: !!flags.debug,
      dryRun: !!flags.dryRun,
      force: !!flags.force,
      config,
    });
  })();
}

module.exports = { runLinter };

