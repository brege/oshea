#!/usr/bin/env node
// scripts/linting/validators/mocha-path-validator.js

require('module-alias/register');

const fs = require('fs');
const glob = require('glob');
const { mocharcPath, lintHelpersPath, lintingConfigPath } = require('@paths');
const { loadLintSection, parseCliArgs } = require(lintHelpersPath);

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
  fix = false,    // stub for interface
  force = false,  // stub for interface
  dryRun = false, // new stub
  config = {}
} = {}) {
  if (debug || (!quiet && !json)) {
    console.log(`[DEBUG] Calculated .mocharc.js path: ${mocharcPath}`);
  }

  if (!fs.existsSync(mocharcPath)) {
    const msg = `.mocharc.js not found at: ${mocharcPath}`;
    if (!quiet && !json) console.error(msg);
    if (json) {
      process.stdout.write(JSON.stringify({ error: msg, missing: true, path: mocharcPath }, null, 2) + '\n');
    }
    process.exitCode = 1;
    return {
      error: msg,
      missing: true,
      path: mocharcPath,
      summary: { found: 0, missing: 1 },
      results: []
    };
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

  // Optionally filter patterns using config.excludes
  const excludes = config.excludes || [];
  const patterns = Array.from(extractJsPatterns(mochaConfig)).filter(
    pattern => !excludes.some(ex => pattern.includes(ex))
  );

  let missingCount = 0;
  const results = [];

  patterns.forEach(pattern => {
    if (pattern.includes('*')) {
      const matches = glob.sync(pattern);
      if (matches.length === 0) {
        missingCount++;
        results.push({ type: 'missing', pattern });
      } else {
        results.push({ type: 'found', pattern, count: matches.length });
      }
    } else {
      if (fs.existsSync(pattern)) {
        results.push({ type: 'found', pattern });
      } else {
        missingCount++;
        results.push({ type: 'missing', pattern });
      }
    }
  });

  const summary = {
    found: results.filter(r => r.type === 'found').length,
    missing: results.filter(r => r.type === 'missing').length
  };

  if (json) {
    process.stdout.write(JSON.stringify({
      path: mocharcPath,
      summary,
      results
    }, null, 2) + '\n');
  } else if (quiet) {
    if (missingCount > 0) {
      console.log('Validating test paths in .mocharc.js:');
      console.log('-------------------------------------');
      for (const res of results) {
        if (res.type === 'missing') {
          console.log(`✗ MISSING: ${res.pattern}`);
        }
      }
      console.log('-------------------------------------');
      console.log(`Validation complete: ${missingCount} missing pattern(s)`);
    }
  } else {
    console.log('Validating test paths in .mocharc.js:');
    console.log('-------------------------------------');
    for (const res of results) {
      if (res.type === 'found' && res.count !== undefined) {
        console.log(`✓ FOUND (${res.count} files): ${res.pattern}`);
      } else if (res.type === 'found') {
        console.log(`✓ FOUND: ${res.pattern}`);
      } else if (res.type === 'missing') {
        console.log(`✗ MISSING: ${res.pattern}`);
      }
    }
    console.log('-------------------------------------');
    if (missingCount === 0) {
      console.log('Validation complete');
    } else {
      console.log(`Validation complete: ${missingCount} missing pattern(s)`);
    }
  }

  process.exitCode = missingCount === 0 ? 0 : 1;
  return { path: mocharcPath, summary, results };
}

// CLI entry
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));

  const config = loadLintSection('validate-mocha', lintingConfigPath) || {};

  runValidator({
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    fix: !!flags.fix,      // stub
    force: !!flags.force,  // stub
    dryRun: !!flags.dryRun,
    config
  });
}

module.exports = { runValidator };

