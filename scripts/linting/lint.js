#!/usr/bin/env node
// scripts/linting/lint.js

require('module-alias/register');

const yaml = require('js-yaml');
const { lintingConfigPath, lintHelpersPath, lintingHarnessPath } = require('@paths');
const { loadLintConfig, parseCliArgs } = require(lintHelpersPath);
const { runHarness } = require(lintingHarnessPath);

function main() {
  const { flags, targets, only } = parseCliArgs(process.argv.slice(2));

  try {
    const fullConfig = loadLintConfig(lintingConfigPath);
    const topLevelKeys = Object.keys(fullConfig || {});
    const harnessSteps = fullConfig.harness?.steps || [];

    // Handle --config
    if (flags.config) {
      let output;

      if (only) {
        if (topLevelKeys.includes(only)) {
          // Print top-level YAML section keyed by canonical name
          output = { [only]: fullConfig[only] };
        } else {
          console.error(`No top-level config section found matching: "${only}"`);
          process.exit(1);
        }
      } else {
        output = fullConfig;
      }

      const formatted = flags.json
        ? JSON.stringify(output, null, 2)
        : yaml.dump(output, { noRefs: true });

      console.log(formatted);
      process.exit(0);
    }

    // Handle --list
      if (flags.list) {
        let filtered = harnessSteps;
        if (only) {
          filtered = harnessSteps.filter(step => {
            const key = step.key || '';
            return key.toLowerCase().includes(only.toLowerCase()) ||
                   step.label.toLowerCase().includes(only.toLowerCase());
          });
        }

        const rows = filtered.map(step => ({
          Key: step.key || '',
          Label: step.label || '',
        }));

        const pad = (str, len) => str.padEnd(len, ' ');
        const keyWidth = Math.max(...rows.map(r => r.Key.length), 8);
        const labelWidth = Math.max(...rows.map(r => r.Label.length), 8);

        console.log('┌' + '─'.repeat(keyWidth + 2) + '┬' + '─'.repeat(labelWidth + 2) + '┐');
        console.log(`│ ${pad('Key', keyWidth)} │ ${pad('Label', labelWidth)} │`);
        console.log('├' + '─'.repeat(keyWidth + 2) + '┼' + '─'.repeat(labelWidth + 2) + '┤');

        for (const row of rows) {
          console.log(`│ ${pad(row.Key, keyWidth)} │ ${pad(row.Label, labelWidth)} │`);
        }

        console.log('└' + '─'.repeat(keyWidth + 2) + '┴' + '─'.repeat(labelWidth + 2) + '┘');
        process.exit(0);
      }

    // Run harness
    const config = fullConfig.harness;
    runHarness(config, flags, targets, only);

  } catch (error) {
    console.error('Error running lint harness:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

