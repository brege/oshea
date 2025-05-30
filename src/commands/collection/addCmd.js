// src/commands/collection/addCmd.js
// CollectionsManager instance will be passed via args.manager

module.exports = {
  command: 'add <url_or_path>',
  describe: 'Adds a new plugin collection from a URL or local path.',
  builder: (yargsCmd) => {
    yargsCmd
      .positional('url_or_path', {
        describe: 'The URL (e.g., Git repository) or local filesystem path to the plugin collection.',
        type: 'string',
        demandOption: true,
      })
      .option('name', {
        alias: 'n',
        describe: 'Optional. A specific local name for this collection. If not provided, a name will be derived.',
        type: 'string'
      });
  },
  handler: async (args) => {
    if (!args.manager) {
      console.error("FATAL ERROR: CollectionsManager instance not found in CLI arguments.");
      process.exit(1); // Should not happen if cli.js middleware is correct
    }
    const manager = args.manager;

    try {
      // The CollectionsManager.addCollection method itself handles console output
      await manager.addCollection(args.url_or_path, { name: args.name });
      // Minimal additional output from md-to-pdf's own CLI layer, if any.
      // The CM method already logs success/failure and paths.
    } catch (error) {
      // CollectionsManager methods are expected to log their own specific errors.
      // This catch block is for unexpected errors during the call or if CM throws.
      console.error(chalk.red(`\nERROR in 'md-to-pdf collection add' command execution: ${error.message}`));
      if (process.env.DEBUG_CM === 'true' && error.stack) console.error(chalk.red(error.stack));
      process.exit(1);
    }
  }
};
