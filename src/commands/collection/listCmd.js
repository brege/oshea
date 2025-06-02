// src/commands/collection/listCmd.js
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

module.exports = {
  command: 'list',
  describe: 'Lists all downloaded plugin collection names, their sources, and status. Use --short for a condensed view.',
  builder: (yargsCmd) => {
    yargsCmd
      .option('short', {
        describe: 'Display a condensed, one-line summary for each collection.',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error(chalk.red("FATAL ERROR: CollectionsManager instance not found in CLI arguments."));
      process.exit(1);
    }
    const manager = args.manager;

    try {
      const collections = await manager.listCollections('downloaded');
      if (collections.length === 0) {
        console.log(chalk.yellow("No collections downloaded."));
        return;
      }
      console.log(chalk.blue("\nDownloaded plugin collections:"));

      if (args.short) {
        let maxNameWidth = "NAME".length;
        let maxSourceTypeWidth = "SOURCE TYPE".length;
        collections.forEach(coll => {
          if (coll.name.length > maxNameWidth) maxNameWidth = coll.name.length;
          let sourceType = "Unknown";
          if (coll.special_type === 'singleton_container') {
            sourceType = "Managed Dir";
          } else if (/^(http(s)?:\/\/|git@)/.test(coll.source || '') || (coll.source || '').endsWith('.git')) {
            sourceType = "Git";
          } else if (coll.source && coll.source !== 'N/A (Metadata missing or unreadable)') {
            sourceType = "Local Path";
          }
          if (sourceType.length > maxSourceTypeWidth) maxSourceTypeWidth = sourceType.length;
        });

        console.log(chalk.bold(`  ${'NAME'.padEnd(maxNameWidth)} | ${'SOURCE TYPE'.padEnd(maxSourceTypeWidth)} | SOURCE/PATH`));
        console.log(chalk.bold(`  ${'-'.repeat(maxNameWidth)} | ${'-'.repeat(maxSourceTypeWidth)} | ${'-'.repeat('SOURCE/PATH'.length)}`));

        collections.forEach(coll => {
          const nameText = chalk.yellowBright(coll.name);
          let sourceType = "Unknown";
          let sourceOriginText = chalk.dim(coll.source || 'N/A');

          if (coll.special_type === 'singleton_container') {
            sourceType = chalk.blue("Managed Dir");
          } else if (/^(http(s)?:\/\/|git@)/.test(coll.source || '') || (coll.source || '').endsWith('.git')) {
            sourceType = chalk.magenta("Git");
          } else if (coll.source && coll.source !== 'N/A (Metadata missing or unreadable)') {
            sourceType = chalk.cyan("Local Path");
          }
          
          const plainName = stripAnsi(nameText);
          const plainSourceType = stripAnsi(sourceType);

          console.log(`  ${nameText.padEnd(maxNameWidth + (nameText.length - plainName.length))} | ${sourceType.padEnd(maxSourceTypeWidth + (sourceType.length - plainSourceType.length))} | ${sourceOriginText}`);
        });

      } else { // Not short
        collections.forEach(coll => {
          let sourceDisplay = coll.source || 'N/A';
          let sourceType = 'N/A';

          if (coll.special_type === 'singleton_container') {
            sourceType = chalk.blue("Managed Directory"); // More descriptive
            sourceDisplay = chalk.gray(coll.source);     // Display the actual path
          } else if (/^(http(s)?:\/\/|git@)/.test(coll.source || '') || (coll.source || '').endsWith('.git')) {
            sourceType = chalk.magenta("Git");
            sourceDisplay = chalk.gray(coll.source);
          } else if (coll.source && coll.source !== 'N/A (Metadata missing or unreadable)') {
            sourceType = chalk.cyan("Local Path");
            sourceDisplay = chalk.gray(coll.source);
          } else {
             sourceType = chalk.dim("Unknown");
             sourceDisplay = chalk.dim(sourceDisplay);
          }

          console.log(`  - Name: ${chalk.yellowBright(coll.name)}`);
          console.log(`    Source Type: ${sourceType}`);
          console.log(`    Source Origin: ${sourceDisplay}`); // Will show actual path for container
          console.log(`    Added: ${chalk.gray(coll.added_on || 'N/A')}`);
          if (coll.updated_on) {
            console.log(`    Last Updated: ${chalk.gray(coll.updated_on)}`);
          }
          console.log(chalk.white("  ---"));
        });
      }

    } catch (error) {
      console.error(chalk.red(`\nERROR in 'collection list' command execution: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
