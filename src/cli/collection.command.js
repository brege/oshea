// src/cli/collection.command.js
const {
  collectionsAddCommandPath,
  collectionsListCommandPath,
  collectionsRemoveCommandPath,
  collectionsUpdateCommandPath
} = require('@paths');
const addCommand = require(collectionsAddCommandPath);
const listCommand = require(collectionsListCommandPath);
const removeCommand = require(collectionsRemoveCommandPath);
const updateCommand = require(collectionsUpdateCommandPath);

module.exports = {
  command: 'collection <subcommand>',
  describe: 'manage plugin collections',
  builder: (yargs) => {
    return yargs
      .command(addCommand)
      .command(listCommand)
      .command(removeCommand)
      .command(updateCommand)
      .demandCommand(1, 'A subcommand (add, list, remove, update) is required.')
      .strict();
  },
  handler: (argv) => {}
};
