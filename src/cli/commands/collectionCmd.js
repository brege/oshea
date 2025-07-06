// src/cli/commands/collectionCmd.js
const { cliCommandsPath } = require('@paths');
const path = require('path');

const addCmd = require(path.join(cliCommandsPath, 'collection', 'addCmd.js'));
const listCmd = require(path.join(cliCommandsPath, 'collection', 'listCmd.js'));
const removeCmd = require(path.join(cliCommandsPath, 'collection', 'removeCmd.js'));
const updateCmd = require(path.join(cliCommandsPath, 'collection', 'updateCmd.js'));

module.exports = {
  command: 'collection <subcommand>',
  describe: 'manage plugin collections',
  builder: (yargs) => {
    return yargs
      .command(addCmd)
      .command(listCmd)
      .command(removeCmd)
      .command(updateCmd)
      .demandCommand(1, 'A subcommand (add, list, remove, update) is required.')
      .strict();
  },
  handler: (argv) => {}
};
