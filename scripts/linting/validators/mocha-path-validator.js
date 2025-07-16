#!/usr/bin/env node
// scripts/linting/validators/mocha-path-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk'); // ← FIXED: chalk was missing
const { mocharcPath, lintHelpersPath, lintingConfigPath, formattersPath, projectRoot } = require('@paths');
const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { adaptRawIssuesToEslintFormat, formatLintResults } = require(formattersPath);

// Extract all .js patterns from a Mocha config object
function* extractJsPatterns(obj) {
  if (typeof obj === 'string' && obj.endsWith('.js')) {
    yield obj;
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      yield* extractJsPatterns(item);
    }
  } else if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      yield* extractJsPatterns(value);
    }
  }
}

function runValidator({
  quiet = false,
  json = false,
  debug = false,
  fix = false,
  force = false,
  dryRun = false,
  config = {}
} = {}) {
  if (debug) {
    console.log(`[DEBUG] Calculated .mocharc.js path: ${mocharcPath}`);
  }

  if (!fs.existsSync(mocharcPath)) {
    const msg = `.mocharc.js not found at: ${mocharcPath}`;
    const result = {
      error: msg,
      missing: true,
      path: mocharcPath,
      summary: { found: 0, missing: 1 },
      results: [],
      issues: [
        {
          file: '.mocharc.js',
          message: msg,
          rule: 'missing-config-file',
          severity: 2,
        },
      ]
    };

    if (json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else if (!quiet) {
      console.error(msg);
    }

    process.exitCode = 1;
    return result;
  }

  let mochaConfig;
  try {
    mochaConfig = require(mocharcPath);
  } catch (e) {
    const content = fs.readFileSync(mocharcPath, 'utf8');
    try {
      mochaConfig = eval(content.replace(/^module\.exports\s*=\s*/, ''));
    } catch {
      mochaConfig = {};
    }
  }

  const excludes = config.excludes || [];
  const patterns = Array.from(extractJsPatterns(mochaConfig)).filter(
    pattern => !excludes.some(ex => pattern.includes(ex))
  );

  const results = [];
  const issues = [];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const matches = glob.sync(pattern);
      if (matches.length === 0) {
        issues.push({
          file: '.mocharc.js',
          message: `No files matched pattern: "${pattern}"`,
          rule: 'missing-test-path',
          severity: 2,
        });
        results.push({ type: 'missing', pattern });
      } else {
        results.push({ type: 'found', pattern, count: matches.length });
      }
    } else {
      if (fs.existsSync(pattern)) {
        results.push({ type: 'found', pattern });
      } else {
        issues.push({
          file: '.mocharc.js',
          message: `Missing test file: "${pattern}"`,
          rule: 'missing-test-path',
          severity: 2,
        });
        results.push({ type: 'missing', pattern });
      }
    }
  }

  const summary = {
    found: results.filter(r => r.type === 'found').length,
    missing: results.filter(r => r.type === 'missing').length,
  };

  if (!quiet) {
    const eslintResults = adaptRawIssuesToEslintFormat(issues);
    const formattedOutput = formatLintResults(eslintResults, 'stylish');

    if (formattedOutput) {
      console.log(formattedOutput);
    }

    if (issues.length === 0 && !json) {
      console.log('✔ No problems');
      console.log('✔ All test patterns in .mocharc.js are valid.');
    }
  }

  // Verbose debug: print all resolved and matched patterns
  if (debug && results.length > 0) {
    console.log('\n[DEBUG] Validated patterns extracted from .mocharc.js:');
    results.forEach(r => {
      const label = r.type === 'found'
        ? chalk.green('[✓]')
        : chalk.red('[✗]');
      const trail = r.type === 'found' && r.count
        ? chalk.gray(`→ ${r.count} file${r.count === 1 ? '' : 's'} matched`)
        : r.type === 'missing'
          ? chalk.gray('→ NOT FOUND')
          : '';

      const rel = path.isAbsolute(r.pattern)
        ? path.relative(projectRoot, r.pattern)
        : r.pattern;

      console.log(`  ${label} ${rel} ${trail}`);
    });
  }

  if (json) {
    process.stdout.write(JSON.stringify({ summary, results, issues }, null, 2) + '\n');
  }

  if (debug) {
    console.log('[DEBUG] Patterns scanned:', patterns);
    console.log('[DEBUG] Total issues:', issues.length);
  }

  process.exitCode = summary.missing > 0 ? 1 : 0;
  return { summary, results, issues };
}

// CLI entry point
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('validate-mocha', lintingConfigPath) || {};

  runValidator({
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    fix: !!flags.fix,
    force: !!flags.force,
    dryRun: !!flags.dryRun,
    config
  });
}

module.exports = { runValidator };

