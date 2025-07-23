#!/usr/bin/env node
// scripts/linting/validators/mocha-path-validator.js

require('module-alias/register');

const fs = require('fs');
const glob = require('glob');
const {
  mocharcPath,
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  loggerPath
} = require('@paths');

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);
const { renderLintOutput } = require(visualRenderersPath);

const logger = require(loggerPath);

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

function runValidator(options = {}) {
  const { config = {}, debug = false } = options;
  const issues = [];
  const results = [];

  logger.debug(`[DEBUG] Checking for .mocharc.js at: ${mocharcPath}`);

  if (!fs.existsSync(mocharcPath)) {
    issues.push({
      file: '.mocharc.js',
      message: `.mocharc.js not found at: ${mocharcPath}`,
      rule: 'missing-config-file',
      severity: 2
    });
    return { summary: { errorCount: 1, warningCount: 0, fixedCount: 0 }, results, issues };
  }

  let mochaConfig;
  try {
    mochaConfig = require(mocharcPath);
  } catch (e) {
    logger.debug(`[DEBUG] Failed to require .mocharc.js, falling back to manual parse. Error: ${e.message}`);
    try {
      const content = fs.readFileSync(mocharcPath, 'utf8');
      mochaConfig = eval(`(() => (${content.replace(/^module\.exports\s*=\s*/, '')}))()`);
    } catch (evalError) {
      logger.debug(`[DEBUG] Manual parsing of .mocharc.js failed. Error: ${evalError.message}`);
      mochaConfig = {};
    }
  }

  const excludes = config.excludes || [];
  const patterns = Array.from(extractJsPatterns(mochaConfig)).filter(
    pattern => !excludes.some(ex => pattern.includes(ex))
  );

  logger.debug(`[DEBUG] Found ${patterns.length} patterns to validate.`);

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
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: 0
  };

  return { summary, results, issues };
}

if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('validate-mocha', lintingConfigPath) || {};

  const { summary, results, issues } = runValidator({ config, debug: !!flags.debug });

  // Show debug output if --debug flag is set
  if (flags.debug && results.length > 0) {
    logger.info('\n[DEBUG] Validated patterns extracted from .mocharc.js:\n');
    for (const r of results) {
      const symbol = r.type === 'found' ? '[✓]' : '[✗]';
      const trail = r.count ? `→ ${r.count} file(s) matched` : (r.type === 'missing' ? '→ NOT FOUND' : '');
      const message = `  ${symbol} ${r.pattern} ${trail}`;
      
      // Use appropriate log level based on result type
      if (r.type === 'found') {
        logger.success(message);
      } else if (r.type === 'missing') {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    }
  }

  renderLintOutput({ issues, summary, results, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runValidator };

