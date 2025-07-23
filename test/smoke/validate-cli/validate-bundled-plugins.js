#!/usr/bin/env node
// test/smoke/validate-cli/validate-bundled-plugins.js

require('module-alias/register');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { cliPath, projectRoot, loggerPath } = require('@paths');
const logger = require(loggerPath);

// --- Test Configuration ---
const PLUGINS_DIR = path.join(projectRoot, 'plugins');

// --- Main Execution Logic ---
async function runSmokeTest() {
  logger.info('Smoke Test: Validating all bundled plugins...\n', { format: 'inline' });

  const bundledPlugins = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  let failedPlugins = [];

  for (const pluginName of bundledPlugins) {
    const fullCommand = `node "${cliPath}" plugin validate ${pluginName}`;

    logger.detail(`  Validating: ${pluginName} ... `, { format: 'inline' });

    try {
      await new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
          if (error) {
            return reject({ error, stdout, stderr });
          }
          resolve({ stdout, stderr });
        });
      });
      logger.success('✓ OK\n', { format: 'inline' });
    } catch (result) {
      failedPlugins.push({ plugin: pluginName, error: result.error, stderr: result.stderr });
      logger.error('✗ FAIL\n', { format: 'inline' });
    }
  }

  if (failedPlugins.length > 0) {
    logger.error('\n--- Smoke Test Failed ---', { format: 'inline' });
    logger.error(`${failedPlugins.length} bundled plugin(s) failed validation:`, { format: 'inline' });
    failedPlugins.forEach(({ plugin, error, stderr }) => {
      logger.detail(`\n  - ${plugin}`, { format: 'inline' });
      logger.detail(`    Error: ${error.message.split('\n')[0]}`, { format: 'inline' });
      if (stderr) {
        logger.detail(`    Stderr: ${stderr.trim()}`, { format: 'inline' });
      }
    });
    process.exit(1);
  } else {
    logger.success('\n✓ Smoke Test Passed: All bundled plugins are valid.\n', { format: 'inline' });
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}

