// src/commands/plugin/validateCmd.js - CORRECTED: Removed duplicate output

const path = require('path');
const fs = require('fs');
const { validate: pluginValidator } = require('../../plugin-validator');
const chalk = require('chalk');

module.exports = {
  command: 'validate <pluginIdentifier>',
  describe: 'Validate a plugin by its name or path against the contract.',
  builder: (yargs) => {
    yargs
      .positional('pluginIdentifier', {
        describe: 'The name of the plugin (e.g., "cv") or the path to its directory (e.g., "plugins/my-custom-plugin").',
        type: 'string',
      })
      .demandOption('pluginIdentifier', 'Please provide a plugin name or path to validate.');
  },
  handler: async (argv) => {
    const { pluginIdentifier } = argv;
    let pluginDirectoryPath;

    try {
        const resolvedIdentifier = path.resolve(pluginIdentifier);
        const isPath = fs.existsSync(resolvedIdentifier) && fs.statSync(resolvedIdentifier).isDirectory();

        if (isPath) {
            pluginDirectoryPath = resolvedIdentifier;
        } else {
            const projectRoot = path.resolve(__dirname, '../../../');
            pluginDirectoryPath = path.join(projectRoot, 'plugins', pluginIdentifier);

            if (!fs.existsSync(pluginDirectoryPath) || !fs.statSync(pluginDirectoryPath).isDirectory()) {
                console.error(chalk.red(`Error: Plugin directory not found for identifier: '${pluginIdentifier}'. Expected path: '${pluginDirectoryPath}'.`));
                process.exit(1);
                return;
            }
        }

        // The pluginValidator.validate function now handles all console output itself.
        const validationResult = pluginValidator(pluginDirectoryPath);

        // Based on the validation result, determine the exit code.
        if (!validationResult.isValid) {
            process.exit(1);
        }
        // If isValid is true, process will exit with 0 (success) implicitly.

    } catch (error) {
        console.error(chalk.red(`An unexpected error occurred during validation: ${error.message}`));
        if (error.stack) {
            console.error(chalk.red(error.stack));
        }
        process.exit(1);
    }
  },
};
