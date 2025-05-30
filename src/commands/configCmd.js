// src/commands/configCmd.js
const { displayConfig } = require('../config_display'); // Adjusted path

module.exports = {
  command: "config",
  describe: "Display active configuration settings. Use --pure for config-only output.",
  builder: (yargs) => {
    yargs
      .option("plugin", {
        alias: "p",
        describe: "Display effective configuration for a specific plugin.",
        type: "string"
      })
      .option("pure", {
        describe: "Output only the raw configuration data, suitable for piping or copying.",
        type: "boolean",
        default: false
      });
  },
  handler: async (args) => {
    args.isLazyLoad = false; // Ensure this context is set for ConfigResolver via displayConfig
    await displayConfig(args);
  }
};
