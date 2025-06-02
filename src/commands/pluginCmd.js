// src/commands/pluginCmd.js
const listCmd = require('./plugin/listCmd');
const createCmd = require('./plugin/createCmd');
const helpCmd = require('./plugin/helpCmd');
const enableCmd = require('./plugin/enableCmd');
const disableCmd = require('./plugin/disableCmd');
const addCmd = require('./plugin/addCmd'); // Import the new add command

module.exports = {
  command: 'plugin <subcommand>',
  describe: 'Manage plugins.',
  builder: (yargs) => {
    return yargs
      .command(listCmd)
      .command(createCmd)
      .command(helpCmd)
      .command(enableCmd)
      .command(disableCmd)
      .command(addCmd) // Add the new command
      .demandCommand(1, 'You need to specify a plugin subcommand (e.g., list, create, help, enable, disable, add).')
      .strict();
  },
  handler: (argv) => {
    // This handler will likely not be called directly if subcommands are correctly defined.
  }
};
