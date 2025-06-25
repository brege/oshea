// src/commands/generateCmd.js
const path = require('path'); 
const chalk = require('chalk'); 

module.exports = {
  command: "generate <pluginName>",
  describe: "generate a document from a complex plugin",
  builder: (yargs) => {
    yargs
      .positional("pluginName", { 
        describe: "name of the plugin to use", 
        type: "string",
        completionKey: 'usablePlugins' 
      })
      .option("outdir", { 
        alias: "o", 
        describe: "output directory", 
        type: "string", 
        default: "." 
      })
      .option("filename", { 
        alias: "f", 
        describe: "output pdf filename", 
        type: "string" 
      })
      .option("open", { 
        describe: "open pdf after generation", 
        type: "boolean", 
        default: true 
      })
      .option("watch", { 
        alias: "w", 
        describe: "watch for changes and re-generate", 
        type: "boolean", 
        default: false 
      })
      .strict(false);
  },
  handler: async (args) => {
    args.isLazyLoad = false;
  }
};
