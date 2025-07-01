// src/cli/commands/configCmd.js
const { displayConfig } = require('../config_display');
const path = require('path');
const chalk = require('chalk');


module.exports = {
  command: "config",
  describe: "display active configuration settings",
  builder: (yargs) => {
    yargs
      .option("plugin", {
        alias: "p",
        describe: "display the effective configuration for a plugin",
        type: "string",
        completionKey: 'usablePlugins'
      })
      .option("pure", {
        describe: "output raw configuration data (for piping)",
        type: "boolean",
        default: false
      });
  },
  handler: async (args) => {
    args.isLazyLoad = false;
    await displayConfig(args);
  }
};
