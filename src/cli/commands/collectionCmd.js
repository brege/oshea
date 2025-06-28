// src/commands/collectionCmd.js
const chalk = require('chalk');
const addCmd = require('./collection/addCmd');
const listCmd = require('./collection/listCmd');
const removeCmd = require('./collection/removeCmd');
const updateCmd = require('./collection/updateCmd');
// const archetypeCmd = require('./collection/archetypeCmd'); // DELETED

module.exports = {
  command: 'collection <subcommand>',
  describe: 'manage plugin collections',
  builder: (yargs) => {
    return yargs
      .command(addCmd)
      .command(listCmd)
      .command(removeCmd)
      .command(updateCmd)
      // .command(archetypeCmd) // DELETED
      .demandCommand(1, 'A subcommand (add, list, remove, update) is required.')
      .strict();
  },
  handler: (argv) => {}
};
