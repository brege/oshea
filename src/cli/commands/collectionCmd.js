// src/cli/commands/collectionCmd.js
const {
  collectionsAddCmdPath,
  collectionsListCmdPath,
  collectionsRemoveCmdPath,
  collectionsUpdateCmdPath
} = require('@paths');
const addCmd = require(collectionsAddCmdPath);
const listCmd = require(collectionsListCmdPath);
const removeCmd = require(collectionsRemoveCmdPath);
const updateCmd = require(collectionsUpdateCmdPath);

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
