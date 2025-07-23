#!/usr/bin/env node
// test/smoke/validate-cli/validate-app-help.js

require('module-alias/register');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { cliCommandsPath, cliPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

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
    } else if (entry.endsWith('.command.js')) {
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
  logger.info('Smoke Test: Validating all --help commands...\n', { format: 'inline' });

  const commandPartsList = discoverCommands(cliCommandsPath);
  commandPartsList.push([]); // Add the root command

  const allCommands = Array.from(new Set(commandPartsList.map(p => p.join(' ')))).sort();
  let failedCommands = [];

  for (const cmdParts of allCommands) {
    const fullCommand = `node "${cliPath}" ${cmdParts} --help`;
    const commandDisplay = `md-to-pdf ${cmdParts} --help`.trim();

    logger.detail(`  Testing: ${commandDisplay} ... `, { format: 'inline' });

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
      failedCommands.push({ command: commandDisplay, error: result.error, stderr: result.stderr });
      logger.error('✗ FAIL\n', { format: 'inline' });
    }
  }

  if (failedCommands.length > 0) {
    logger.error('\n--- Smoke Test Failed ---', { format: 'inline' });
    logger.error(`${failedCommands.length} command(s) failed to execute with --help:`, { format: 'inline' });
    failedCommands.forEach(({ command, error, stderr }) => {
      logger.detail(`\n  - ${command}`, { format: 'inline' });
      logger.detail(`    Error: ${error.message.split('\n')[0]}`, { format: 'inline' });
      if (stderr) {
        logger.detail(`    Stderr: ${stderr.trim()}`, { format: 'inline' });
      }
    });
    process.exit(1);
  } else {
    logger.success('\n✓ Smoke Test Passed: All --help commands executed successfully.\n', { format: 'inline' });
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTest();
}

