module.exports = {
  command: 'plugin <command>',
  describe: 'Manage plugins.',
  builder: (yargs) => {
    return yargs.commandDir('plugin'); // This will automatically require all files ending in 'Cmd.js'.
  },
  handler: (argv) => {},
};
