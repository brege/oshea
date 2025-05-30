// src/commands/generateCmd.js
// Note: commonCommandHandler and executeGeneration are assumed to be in cli.js

module.exports = {
  command: "generate <pluginName>",
  describe: "Generate a document using a specified plugin that requires complex inputs.",
  builder: (yargs) => {
    yargs
      .positional("pluginName", { 
        describe: "Name of the plugin.", 
        type: "string" 
      })
      .option("outdir", { 
        alias: "o", 
        describe: "Output directory.", 
        type: "string", 
        default: "." 
      })
      .option("filename", { 
        alias: "f", 
        describe: "Output PDF filename.", 
        type: "string" 
      })
      .option("open", { 
        describe: "Open PDF after generation.", 
        type: "boolean", 
        default: true 
      })
      .option("watch", { 
        alias: "w", 
        describe: "Watch for changes.", 
        type: "boolean", 
        default: false 
      })
      .strict(false); // Allows extra options for the plugin
  },
  handler: async (args) => {
    args.isLazyLoad = false;
    // Similar to convert, the actual execution is orchestrated by cli.js's
    // main yargs setup calling commonCommandHandler.
  }
};
