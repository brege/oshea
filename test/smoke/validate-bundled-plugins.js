#!/usr/bin/env node
// test/smoke/validate-bundled-plugins.js

require('module-alias/register');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { cliPath, projectRoot } = require('@paths');

// --- Test Configuration ---
const PLUGINS_DIR = path.join(projectRoot, 'plugins');

// --- Main Execution Logic ---
async function runSmokeTest() {
  console.log(chalk.blue('Smoke Test: Validating all bundled plugins...'));

  const bundledPlugins = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  let failedPlugins = [];

  for (const pluginName of bundledPlugins) {
    const fullCommand = `node "${cliPath}" plugin validate ${pluginName}`;

    process.stdout.write(`  Validating: ${chalk.cyan(pluginName)} ... `);

    try {
      await new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
          if (error) {
            return reject({ error, stdout, stderr });
          }
          resolve({ stdout, stderr });
        });
      });
      console.log(chalk.green('✓ OK'));
    } catch (result) {
      failedPlugins.push({ plugin: pluginName, error: result.error, stderr: result.stderr });
      console.log(chalk.red('✗ FAIL'));
    }
  }

  if (failedPlugins.length > 0) {
    console.error(chalk.red.bold('\n--- Smoke Test Failed ---'));
    console.error(chalk.red(`${failedPlugins.length} bundled plugin(s) failed validation:`));
    failedPlugins.forEach(({ plugin, error, stderr }) => {
      console.error(`\n  - ${chalk.cyan(plugin)}`);
      console.error(chalk.gray(`    Error: ${error.message.split('\n')[0]}`));
      if(stderr) {
        console.error(chalk.gray(`    Stderr: ${stderr.trim()}`));
      }
    });
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✓ Smoke Test Passed: All bundled plugins are valid.'));
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}
