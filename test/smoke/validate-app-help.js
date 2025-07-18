#!/usr/bin/env node
// test/smoke/validate-app-help.js

require('module-alias/register');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { cliCommandsPath, cliPath } = require('@paths');

// --- Command Discovery Logic (reused and simplified) ---
function parseBaseCommand(commandDef) {
  const cmdString = Array.isArray(commandDef) ? commandDef[0] : commandDef;
  return cmdString.split(' ')[0];
}

function discoverCommands(dir, prefixParts = []) {
  let commands = [];
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      const groupName = path.basename(fullPath);
      commands.push([...prefixParts, groupName]);
      commands.push(...discoverCommands(fullPath, [...prefixParts, groupName]));
    } else if (entry.endsWith('Cmd.js')) {
      const commandModule = require(fullPath);
      if (!commandModule.command) continue;

      let commandDefinition = commandModule.command;
      if (commandModule.explicitConvert && commandModule.explicitConvert.command) {
        commandDefinition = commandModule.explicitConvert.command;
      }

      const commandName = parseBaseCommand(commandDefinition);
      if (['$0', 'plugin', 'collection'].includes(commandName)) {
        continue;
      }
      commands.push([...prefixParts, commandName]);
    }
  }
  return commands;
}

// --- Main Execution Logic ---
async function runSmokeTest() {
  console.log(chalk.blue('Smoke Test: Validating all --help commands...'));

  const commandPartsList = discoverCommands(cliCommandsPath);
  commandPartsList.push([]); // Add the root command

  const allCommands = Array.from(new Set(commandPartsList.map(p => p.join(' ')))).sort();
  let failedCommands = [];

  for (const cmdParts of allCommands) {
    const fullCommand = `node "${cliPath}" ${cmdParts} --help`;
    const commandDisplay = `md-to-pdf ${cmdParts} --help`.trim();

    process.stdout.write(`  Testing: ${chalk.cyan(commandDisplay)} ... `);

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
      failedCommands.push({ command: commandDisplay, error: result.error, stderr: result.stderr });
      console.log(chalk.red('✗ FAIL'));
    }
  }

  if (failedCommands.length > 0) {
    console.error(chalk.red.bold('\n--- Smoke Test Failed ---'));
    console.error(chalk.red(`${failedCommands.length} command(s) failed to execute with --help:`));
    failedCommands.forEach(({ command, error, stderr }) => {
      console.error(`\n  - ${chalk.cyan(command)}`);
      console.error(chalk.gray(`    Error: ${error.message.split('\n')[0]}`));
      if(stderr) {
        console.error(chalk.gray(`    Stderr: ${stderr.trim()}`));
      }
    });
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✓ Smoke Test Passed: All --help commands executed successfully.'));
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}
