// src/cli/plugin.command.js
module.exports = {
  command: 'plugin <command>',
  describe: 'manage plugins',
  builder: (yargs) => {
    return yargs.commandDir('plugin');
  },
  handler: (_argv) => {},
};
